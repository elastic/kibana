/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import FsPromises from 'fs/promises';
import type { Plugin } from 'vite';

// Prevent duplicate log messages when multiple Vite instances run in
// the same process (parent runtime, optimizer, child runtime).
let hasLoggedStartup = false;

interface ModuleResolverOptions {
  /** Path to the repository root */
  repoRoot: string;
  /** Whether to enable verbose logging */
  verbose?: boolean;
}

/**
 * Known @kbn/* packages that are CommonJS and must be externalized.
 * These packages use require()/module.exports and cannot be transformed by Vite's ESM runner.
 */
const COMMONJS_KBN_PACKAGES = [
  // Note: @kbn/repo-info was converted to ESM
  // Note: @kbn/repo-packages was converted to ESM
  // Note: @kbn/babel-register was removed from the codebase
  '@kbn/babel-transform',
  '@kbn/peggy',
  '@kbn/ui-shared-deps-npm',
  '@kbn/eslint-plugin-eslint',
  '@kbn/timelion-grammar',
  '@kbn/dot-text',
  '@kbn/node-libs-browser-webpack-plugin',
  '@kbn/cypress-config',
  '@kbn/scout-reporting',
];

/**
 * @kbn/* packages that should NEVER be resolved to source files.
 * These are build infrastructure packages that must be loaded from their
 * pre-built target/index.js to avoid circular dependencies with the
 * Module Runner that depends on them.
 */
const KBN_PACKAGES_LOAD_FROM_TARGET = ['@kbn/vite-server', '@kbn/vite-config'];

// Helper: cached existsSync + statSync for files (avoids redundant syscalls)
const fileExistsCache = new Map<string, boolean>();
function isFile(filePath: string): boolean {
  const cached = fileExistsCache.get(filePath);
  if (cached !== undefined) return cached;
  try {
    const result = Fs.existsSync(filePath) && Fs.statSync(filePath).isFile();
    fileExistsCache.set(filePath, result);
    return result;
  } catch {
    fileExistsCache.set(filePath, false);
    return false;
  }
}

/**
 * Vite plugin that handles server-side module resolution for the Module Runner.
 *
 * Responsibilities:
 * 1. Externalizes non-@kbn/* bare specifiers (node_modules packages)
 * 2. Handles CommonJS @kbn/* packages via virtual ESM wrappers
 * 3. Skips infrastructure packages that must load from pre-built target/
 * 4. Resolves @kbn/* packages to their source .ts files
 *
 * Note: Transform caching is handled separately by kbnTransformDiskCachePlugins.
 */
export function kbnCacheResolverPlugin(options: ModuleResolverOptions): Plugin {
  const { repoRoot, verbose = false } = options;

  const cacheDir = Path.resolve(repoRoot, '.vite-server-cache');
  const resolveCachePath = Path.join(cacheDir, 'resolve-cache.json');

  let packageMap: Map<string, string> | null = null; // packageId -> relative dir

  // Resolution caches — these eliminate redundant sync filesystem calls on hot paths.
  const sourceResolveCache = new Map<string, string | null>(); // source file candidate results
  const externalPkgCache = new Map<string, boolean>(); // node_modules existence checks

  // Load the package map (package ID -> relative directory)
  function loadPackageMap(): Map<string, string> {
    const packageMapPath = Path.resolve(
      repoRoot,
      'src/platform/packages/private/kbn-repo-packages/package-map.json'
    );

    try {
      const content = Fs.readFileSync(packageMapPath, 'utf-8');
      const entries: Array<[string, string]> = JSON.parse(content);
      return new Map(entries);
    } catch (error) {
      console.warn('[kbn-module-resolver] Failed to load package map:', error);
      return new Map();
    }
  }

  /**
   * Load persisted resolution caches from disk. Validates that resolved file
   * paths still exist before restoring entries, so stale entries from moved
   * or deleted files are automatically pruned.
   */
  function loadResolveCache(): void {
    try {
      if (!Fs.existsSync(resolveCachePath)) return;

      const raw = Fs.readFileSync(resolveCachePath, 'utf-8');
      const data = JSON.parse(raw);
      let restored = 0;
      let pruned = 0;

      // Restore source resolution cache — validate that resolved files still exist
      if (data.sourceResolveCache) {
        for (const [key, value] of data.sourceResolveCache) {
          if (value === null) {
            // Null entries (no source found) are cheap to re-check, skip restoring
            continue;
          }
          if (Fs.existsSync(value)) {
            sourceResolveCache.set(key, value);
            fileExistsCache.set(value, true);
            restored++;
          } else {
            pruned++;
          }
        }
      }

      // Restore external package cache — node_modules dirs are stable across restarts
      if (data.externalPkgCache) {
        for (const [key, value] of data.externalPkgCache) {
          externalPkgCache.set(key, value);
        }
      }

      // Restore file existence cache entries
      if (data.fileExistsCache) {
        for (const [key, value] of data.fileExistsCache) {
          if (!fileExistsCache.has(key)) {
            fileExistsCache.set(key, value);
          }
        }
      }

      if (!hasLoggedStartup) {
        console.log(
          `[kbn-module-resolver] Restored ${restored} cached resolutions` +
            (pruned > 0 ? ` (pruned ${pruned} stale)` : '')
        );
      }
    } catch {
      // Cache file corrupt or unreadable — start fresh
    }
  }

  /**
   * Persist resolution caches to disk for faster startup on subsequent runs.
   */
  function saveResolveCache(): void {
    try {
      if (!Fs.existsSync(cacheDir)) {
        Fs.mkdirSync(cacheDir, { recursive: true });
      }

      const data = JSON.stringify({
        sourceResolveCache: Array.from(sourceResolveCache.entries()),
        externalPkgCache: Array.from(externalPkgCache.entries()),
        fileExistsCache: Array.from(fileExistsCache.entries()),
      });

      const tmpPath = `${resolveCachePath}.tmp`;
      Fs.writeFileSync(tmpPath, data, 'utf-8');
      Fs.renameSync(tmpPath, resolveCachePath);
    } catch {
      // Non-fatal — worst case we re-resolve next time
    }
  }

  /**
   * Pre-warm the file existence cache by checking common entry point patterns
   * for all packages in parallel using async I/O. This avoids thousands of
   * sequential synchronous existsSync + statSync calls during module resolution.
   */
  async function prewarmFileExistsCache(pkgMap: Map<string, string>): Promise<void> {
    const checks: Array<{ path: string; promise: Promise<boolean> }> = [];

    for (const [, pkgRelDir] of pkgMap) {
      const absolutePkgDir = Path.resolve(repoRoot, pkgRelDir);

      // Check all common entry point candidates for each package
      const candidates = [
        Path.join(absolutePkgDir, 'index.ts'),
        Path.join(absolutePkgDir, 'index.tsx'),
        Path.join(absolutePkgDir, 'src', 'index.ts'),
        Path.join(absolutePkgDir, 'src', 'index.tsx'),
        Path.join(absolutePkgDir, 'target', 'index.js'),
        Path.join(absolutePkgDir, 'index.js'),
      ];

      for (const candidate of candidates) {
        if (!fileExistsCache.has(candidate)) {
          checks.push({
            path: candidate,
            promise: FsPromises.stat(candidate)
              .then((stat) => stat.isFile())
              .catch(() => false),
          });
        }
      }
    }

    if (checks.length === 0) return;

    const results = await Promise.all(checks.map((c) => c.promise));
    for (let i = 0; i < checks.length; i++) {
      fileExistsCache.set(checks[i].path, results[i]);
    }

    console.log(
      `[kbn-module-resolver] Pre-warmed file cache with ${checks.length} entries`
    );
  }

  return {
    name: 'kbn-cache-resolver',
    enforce: 'pre', // Run before other resolvers

    async buildStart() {
      packageMap = loadPackageMap();
      loadResolveCache();
      await prewarmFileExistsCache(packageMap);
      if (!hasLoggedStartup) {
        console.log(`[kbn-module-resolver] Loaded package map with ${packageMap.size} packages`);
        hasLoggedStartup = true;
      }
    },

    resolveId: {
      order: 'pre' as const,
      handler(source: string, importer: string | undefined, options: any) {
        // Debug: log all non-relative, non-kbn resolveId calls when verbose
        if (
          verbose &&
          !source.startsWith('.') &&
          !source.startsWith('/') &&
          !source.startsWith('\0') &&
          !source.startsWith('@kbn/')
        ) {
          console.log(
            `[kbn-module-resolver] resolveId non-kbn: source=${source}, importer=${importer?.substring(
              Math.max(0, importer.length - 60)
            )}`
          );
        }

        // Skip relative and absolute paths — these are file imports, not bare specifiers
        if (source.startsWith('.') || source.startsWith('/')) {
          return null;
        }

        // Skip virtual modules
        if (source.startsWith('\0')) {
          return null;
        }

        // Externalize non-@kbn/* bare specifiers (node_modules packages).
        // Both ESM and CJS packages are externalized — the cjsInteropPlugin
        // handles transforming named imports from CJS packages before this point.
        if (!source.startsWith('@kbn/')) {
          const basePackage = source.startsWith('@')
            ? source.split('/').slice(0, 2).join('/')
            : source.split('/')[0];

          // Don't externalize packages that need Vite transformation (noExternal).
          const NO_EXTERNALIZE = ['lodash-es', '@n8n/json-schema-to-zod'];
          if (NO_EXTERNALIZE.includes(basePackage)) {
            return null; // Let Vite handle resolution and transformation
          }

          // Don't externalize JSON file imports — Vite needs to transform them
          if (source.endsWith('.json')) {
            return null;
          }

          // Verify this is an actual npm package by checking node_modules (cached)
          let pkgExists = externalPkgCache.get(basePackage);
          if (pkgExists === undefined) {
            const pkgDir = Path.resolve(repoRoot, 'node_modules', basePackage);
            pkgExists = Fs.existsSync(pkgDir);
            externalPkgCache.set(basePackage, pkgExists);
          }
          if (!pkgExists) {
            return null;
          }

          if (verbose) {
            console.log(`[kbn-module-resolver] Externalizing: ${source}`);
          }
          return { id: source, external: true };
        }

        // Parse the import: @kbn/foo or @kbn/foo/bar/baz
        const parts = source.split('/');
        const packageId = `${parts[0]}/${parts[1]}`; // @kbn/package-name
        const subpath = parts.slice(2).join('/'); // bar/baz or empty

        // Build infrastructure packages must NOT be resolved to source by this plugin.
        if (KBN_PACKAGES_LOAD_FROM_TARGET.includes(packageId)) {
          if (verbose) {
            console.log(`[kbn-module-resolver] Infrastructure package (skip): ${source}`);
          }
          return null; // Let Vite's default SSR externalization handle it
        }

        // Check if this is a known CommonJS @kbn package
        if (COMMONJS_KBN_PACKAGES.includes(packageId)) {
          if (verbose) {
            console.log(`[kbn-module-resolver] CommonJS @kbn package: ${source}`);
          }
          return `\0cjs-external:${source}`;
        }

        // Resolve to source files.
        // This is critical because the default resolver follows package.json exports
        // which point to target/index.js (pre-built CJS bundles). Those CJS bundles
        // break when loaded through Vite's ESM Module Runner.
        if (sourceResolveCache.has(source)) {
          return sourceResolveCache.get(source) ?? null;
        }

        if (packageMap) {
          const pkgDir = packageMap.get(packageId);
          if (pkgDir) {
            const absolutePkgDir = Path.resolve(repoRoot, pkgDir);
            const targetPath = subpath ? Path.join(absolutePkgDir, subpath) : absolutePkgDir;

            // Try common source entry points.
            // Order matters: prefer .ts source > .tsx source > target/index.js > raw .js
            const candidates = subpath
              ? [
                  `${targetPath}.ts`,
                  `${targetPath}.tsx`,
                  `${targetPath}.js`,
                  Path.join(targetPath, 'index.ts'),
                  Path.join(targetPath, 'index.tsx'),
                  Path.join(targetPath, 'index.js'),
                ]
              : [
                  Path.join(targetPath, 'index.ts'),
                  Path.join(targetPath, 'index.tsx'),
                  Path.join(targetPath, 'src', 'index.ts'),
                  Path.join(targetPath, 'src', 'index.tsx'),
                  // Pre-built ESM target (for packages with CJS source)
                  Path.join(targetPath, 'target', 'index.js'),
                  // Raw .js source (last resort)
                  Path.join(targetPath, 'index.js'),
                ];

            for (const candidate of candidates) {
              if (isFile(candidate)) {
                if (verbose) {
                  console.log(
                    `[kbn-module-resolver] ${source} -> ${Path.relative(repoRoot, candidate)}`
                  );
                }
                sourceResolveCache.set(source, candidate);
                return candidate;
              }
            }
          }
        }

        if (verbose) {
          console.log(`[kbn-module-resolver] No source found for ${source}`);
        }
        sourceResolveCache.set(source, null);
        return null;
      },
    },

    buildEnd() {
      saveResolveCache();
    },

    // Load hook to handle CommonJS @kbn/* external modules
    async load(id) {
      if (!id.startsWith('\0cjs-external:')) {
        return null;
      }

      const moduleName = id.slice('\0cjs-external:'.length);
      if (verbose) {
        console.log(`[kbn-module-resolver] Loading CJS external: ${moduleName}`);
      }

      // For CommonJS @kbn/* modules, generate an ESM wrapper that uses
      // createRequire to load the module and re-exports all named exports.
      try {
        const { createRequire: createReq } = await import('module');
        const requireFromRoot = createReq(Path.resolve(repoRoot, 'package.json'));
        const mod = requireFromRoot(moduleName);

        // Get all export names from the module
        const exportNames = Object.keys(mod).filter(
          (key) =>
            key !== 'default' && key !== '__esModule' && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
        );

        // Generate the ESM wrapper code
        const repoRootEscaped = repoRoot.replace(/\\/g, '\\\\');
        const code = `
import { createRequire } from 'module';
import { resolve } from 'path';
const _require = createRequire(resolve('${repoRootEscaped}', 'package.json'));
const _mod = _require('${moduleName}');
export default _mod;
${exportNames.map((name) => `export const ${name} = _mod['${name}'];`).join('\n')}
`;
        return code;
      } catch (error) {
        console.error(`[kbn-module-resolver] Failed to load CJS module ${moduleName}:`, error);
        return null;
      }
    },
  };
}
