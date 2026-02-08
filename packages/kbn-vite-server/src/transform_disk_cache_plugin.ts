/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import Fs from 'fs';
import FsPromises from 'fs/promises';
import Path from 'path';
import type { Plugin } from 'vite';

interface TransformDiskCacheOptions {
  /** Path to the repository root */
  repoRoot: string;
  /** Override the cache directory (default: <repoRoot>/.vite-server-cache/transforms) */
  cacheDir?: string;
  /** Log cache hit/miss stats on shutdown */
  verbose?: boolean;
}

/**
 * Compute a fast content hash (MD5, truncated to 16 hex chars).
 * This is NOT security-sensitive — it's purely for change detection.
 */
function contentHash(text: string): string {
  return createHash('md5').update(text).digest('hex').slice(0, 16);
}

/**
 * Derive a deterministic filename from an absolute file path.
 * Uses MD5 of the path so we never hit OS path-length limits.
 */
function pathToKey(filePath: string): string {
  return createHash('md5').update(filePath).digest('hex');
}

/**
 * Automatic disk-backed transform cache for the Vite Module Runner.
 *
 * Transparently caches
 * the output of Vite's transform pipeline to disk:
 *
 *   1. **Pre-transform** (`enforce: 'pre'`): Before any plugin transforms a
 *      file, check if we have a cached result whose content hash matches the
 *      current source. If so, return it immediately — skipping TypeScript
 *      compilation and all other transforms.
 *
 *   2. **Post-transform** (`enforce: 'post'`): After all plugins have
 *      transformed a file, write the final result to disk for next time.
 *
 * Cache invalidation is automatic: the cache key includes a hash of the raw
 * source content, so any edit to the file produces a different hash and the
 * stale entry is overwritten on the next transform.
 *
 * Cache location: `<repoRoot>/.vite-server-cache/transforms/`
 *
 * Each entry is a JSON file:
 *   `<pathHash>.json` → `{ contentHash, code, map }`
 *
 * Returns an array of Vite plugins (reader + writer + source map stripper) that
 * must all be registered in the plugin list.
 */
export function kbnTransformDiskCachePlugins(options: TransformDiskCacheOptions): Plugin[] {
  const { repoRoot, verbose = false } = options;
  const cacheDir = options.cacheDir || Path.resolve(repoRoot, '.vite-server-cache', 'transforms');

  // When source maps are disabled (the default), we suppress map objects entirely.
  // Returning a `map` object — even as a separate field — triggers Vite's internal
  // VLQ decoder (replaceTokens/parse$4), which costs ~25% of CPU during startup.
  const sourceMapsEnabled = process.env.KBN_VITE_SOURCEMAPS === 'true';

  // Map of moduleId → sourceContentHash, set by the reader on cache miss,
  // consumed by the writer after all transforms complete.
  const pendingHashes = new Map<string, string>();

  let hitCount = 0;
  let missCount = 0;
  let cacheDirReady = false;

  // ── In-memory cache ────────────────────────────────────────────────
  // Pre-loaded cache: maps cache filename → parsed JSON entry.
  // All cache files are read into memory at buildStart (async, parallel)
  // so that transform-time lookups are pure Map.get() — no disk I/O.
  const memoryCache = new Map<
    string,
    { contentHash: string; code: string; map: any; filePath?: string }
  >();
  let memoryCacheReady = false;

  // ── Source file pre-read cache ───────────────────────────────────
  // Pre-loaded source files for all cached modules. Populated during
  // buildStart alongside cache entries. This allows the `load` hook to
  // return source from memory instead of Vite reading from disk,
  // eliminating readFileUtf8 from the hot path (~800ms in parent process).
  const sourceCache = new Map<string, string>(); // absolute filePath → source code
  let sourceCacheReady = false;

  // ── helpers ──────────────────────────────────────────────────────────

  function ensureCacheDir(): void {
    if (cacheDirReady) return;
    if (!Fs.existsSync(cacheDir)) {
      Fs.mkdirSync(cacheDir, { recursive: true });
    }
    cacheDirReady = true;
  }

  function cacheFilePath(id: string): string {
    return Path.join(cacheDir, `${pathToKey(id)}.json`);
  }

  /**
   * Pre-load ALL cache entries into memory at startup. This converts
   * thousands of synchronous readFileSync calls (5.3s of readFileUtf8)
   * into a single parallel async batch that runs before any transforms.
   *
   * Also pre-reads the original source files for cached modules. This
   * enables the `load` hook to return source from memory instead of Vite
   * reading from disk, eliminating ~800ms of readFileUtf8 from startup.
   */
  async function preloadCacheEntries(): Promise<void> {
    ensureCacheDir();
    let files: string[];
    try {
      files = await FsPromises.readdir(cacheDir);
    } catch {
      memoryCacheReady = true;
      sourceCacheReady = true;
      return;
    }

    const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.endsWith('.tmp'));
    if (jsonFiles.length === 0) {
      memoryCacheReady = true;
      sourceCacheReady = true;
      return;
    }

    // Read all cache files in parallel (async I/O, non-blocking)
    const BATCH_SIZE = 200;
    for (let i = 0; i < jsonFiles.length; i += BATCH_SIZE) {
      const batch = jsonFiles.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (file) => {
          const filePath = Path.join(cacheDir, file);
          const raw = await FsPromises.readFile(filePath, 'utf-8');
          const entry = JSON.parse(raw);
          // Key is the filename without .json extension (which is the pathToKey hash)
          const key = file.slice(0, -5); // strip .json
          memoryCache.set(key, entry);
        })
      );
      // Silently ignore individual file read errors
    }

    memoryCacheReady = true;

    // Pre-read source files for all cached modules (async, parallel).
    // This allows the load hook to serve source from memory, avoiding
    // synchronous readFileUtf8 calls during Vite's internal load step.
    const sourceReads: Array<{ filePath: string; promise: Promise<string> }> = [];
    for (const [, entry] of memoryCache) {
      if (entry.filePath && !sourceCache.has(entry.filePath)) {
        sourceReads.push({
          filePath: entry.filePath,
          promise: FsPromises.readFile(entry.filePath, 'utf-8').catch(() => ''),
        });
      }
    }

    if (sourceReads.length > 0) {
      for (let i = 0; i < sourceReads.length; i += BATCH_SIZE) {
        const batch = sourceReads.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (r) => {
            const source = await r.promise;
            if (source) {
              sourceCache.set(r.filePath, source);
            }
          })
        );
      }
    }

    sourceCacheReady = true;
  }

  function readCacheEntry(id: string, hash: string): { code: string; map: any } | null {
    const key = pathToKey(id);

    // Fast path: read from pre-loaded in-memory cache
    if (memoryCacheReady) {
      const entry = memoryCache.get(key);
      if (entry && entry.contentHash === hash) {
        return { code: entry.code, map: entry.map ?? null };
      }
      return null;
    }

    // Fallback: sync read (only used if preload hasn't finished yet)
    try {
      const raw = Fs.readFileSync(cacheFilePath(id), 'utf-8');
      const entry = JSON.parse(raw);
      if (entry.contentHash === hash) {
        return { code: entry.code, map: entry.map ?? null };
      }
    } catch {
      // File doesn't exist or is corrupt → cache miss
    }
    return null;
  }

  function writeCacheEntry(id: string, hash: string, code: string, map?: any): void {
    const entry = { filePath: id, contentHash: hash, code, map: map ?? null };

    // Update the in-memory cache immediately
    memoryCache.set(pathToKey(id), entry);

    // Write to disk asynchronously (fire-and-forget)
    try {
      ensureCacheDir();
      const data = JSON.stringify(entry);
      const tmpPath = `${cacheFilePath(id)}.tmp`;
      // Use async write to avoid blocking the transform pipeline
      FsPromises.writeFile(tmpPath, data, 'utf-8')
        .then(() => FsPromises.rename(tmpPath, cacheFilePath(id)))
        .catch(() => {
          // Non-fatal — worst case we re-transform next time
        });
    } catch {
      // Non-fatal
    }
  }

  /**
   * Determine whether a module should go through the disk cache.
   * We only cache source files that Vite transforms (TypeScript/JSX).
   */
  function shouldCache(id: string): boolean {
    // Skip virtual modules
    if (id.startsWith('\0')) return false;
    // Skip node_modules — these are either externalized or pre-bundled
    // Use '/node_modules/' path segment check (not substring match) to avoid
    // false positives on files whose names contain 'node_modules' as a
    // substring (e.g. find_used_node_modules.ts).
    if (id.includes('/node_modules/')) return false;
    // Only cache TS/JS source files
    if (!/\.(ts|tsx|js|jsx)$/.test(id)) return false;
    return true;
  }

  /**
   * Strip inline sourceMappingURL data URIs from code. The module runner
   * decodes these on every module load (the `replaceTokens`/`parse$4` hotspot),
   * which is extremely expensive with 1000+ modules. Since we provide source
   * maps as a separate `map` object in the transform result, inline source
   * maps in the code are redundant and can be safely removed.
   */
  function stripInlineSourceMap(code: string): string {
    // Match both //# and //@ sourceMappingURL with data: URIs
    return code.replace(/\/\/[#@]\s*sourceMappingURL=data:[^\n]+/g, '');
  }

  // ── plugins ─────────────────────────────────────────────────────────

  const readerPlugin: Plugin = {
    name: 'kbn-transform-disk-cache',
    enforce: 'pre',

    async buildStart() {
      hitCount = 0;
      missCount = 0;
      // Pre-load all cache entries into memory using async parallel I/O.
      // This replaces thousands of synchronous readFileSync calls during
      // transform with fast Map.get() lookups.
      await preloadCacheEntries();
    },

    // Load hook — return pre-read source from memory to skip Vite's internal
    // readFileUtf8 disk I/O. Source files for all cached modules are pre-read
    // during buildStart (async parallel I/O).
    load(id: string) {
      if (!sourceCacheReady || !shouldCache(id)) return null;
      const source = sourceCache.get(id);
      if (source !== undefined) {
        return source;
      }
      return null;
    },

    transform(code: string, id: string) {
      if (!shouldCache(id)) return null;

      const hash = contentHash(code);
      const cached = readCacheEntry(id, hash);

      if (cached) {
        hitCount++;
        // Strip inline sourceMappingURL and suppress the map object when source
        // maps are disabled. Even returning `map` as a separate object triggers
        // Vite's VLQ decoder (replaceTokens/parse$4) — the single biggest CPU
        // hotspot during startup.
        return {
          code: stripInlineSourceMap(cached.code),
          map: sourceMapsEnabled ? cached.map : null,
        };
      }

      // Store the source hash so the writer can persist the final output
      pendingHashes.set(id, hash);
      missCount++;
      return null;
    },
  };

  const writerPlugin: Plugin = {
    name: 'kbn-transform-disk-cache-writer',
    enforce: 'post',

    transform(code: string, id: string) {
      const hash = pendingHashes.get(id);
      if (hash) {
        pendingHashes.delete(id);
        // Only capture source maps when enabled — getCombinedSourcemap() itself
        // triggers VLQ decoding (replaceTokens), so skip it entirely when
        // source maps are disabled for maximum startup performance.
        let map: any = null;
        if (sourceMapsEnabled) {
          try {
            map = this.getCombinedSourcemap();
          } catch {
            // Some modules may not have source maps
          }
        }
        // Strip inline source maps from cached code — the map is stored separately.
        // Write to disk (synchronous but fast — small JSON blob)
        writeCacheEntry(id, hash, stripInlineSourceMap(code), map);
      }
      // Never modify the transform result
      return null;
    },

    buildEnd() {
      const total = hitCount + missCount;
      if (total > 0) {
        console.log(
          `[transform-cache] ${hitCount} cache hits, ${missCount} misses` +
            ` (${total > 0 ? Math.round((hitCount / total) * 100) : 0}% hit rate)`
        );
      }
    },
  };

  // Strip inline source maps from ALL transform results to prevent the
  // module runner from decoding them (the replaceTokens/parse$4 hotspot).
  // This runs after all other plugins and catches modules not handled by
  // the disk cache (virtual modules, node_modules that aren't externalized, etc.)
  const sourceMapStripperPlugin: Plugin = {
    name: 'kbn-strip-inline-sourcemaps',
    enforce: 'post',

    transform(code: string, id: string) {
      // Only strip if the code actually contains an inline source map
      if (code.includes('sourceMappingURL=data:')) {
        return {
          code: stripInlineSourceMap(code),
          map: null, // Let Vite use the accumulated source map from prior transforms
        };
      }
      return null;
    },
  };

  return [readerPlugin, writerPlugin, sourceMapStripperPlugin];
}
