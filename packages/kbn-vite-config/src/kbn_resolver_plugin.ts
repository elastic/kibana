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
import type { Plugin } from 'vite';

/**
 * Read the package map from disk
 * @param repoRoot - The root directory of the Kibana repository
 * @returns A Map of package IDs to their relative directories
 */
export function readPackageMap(repoRoot: string): Map<string, string> {
  const packageMapPath = Path.resolve(
    repoRoot,
    'src/platform/packages/private/kbn-repo-packages/package-map.json'
  );
  const content = Fs.readFileSync(packageMapPath, 'utf8');
  return new Map(JSON.parse(content) as Array<[string, string]>);
}

export interface GenerateKbnAliasesOptions {
  /**
   * When true, check each package's package.json for a "browser" field
   * and use it as the alias target instead of the package directory.
   * This ensures that packages like @kbn/i18n which have separate
   * browser entry points (without Node.js-only imports like fs/promises)
   * resolve correctly in browser builds.
   */
  preferBrowser?: boolean;
}

/**
 * Generate Vite-compatible aliases from the Kibana package map.
 *
 * Aliases are sorted by key length (longest first) so that Vite's
 * `startsWith` prefix matching resolves the correct package. Without
 * sorting, `@kbn/i18n` could incorrectly match `@kbn/i18n-flow`.
 * With longest-first order, `@kbn/i18n-flow` is always checked before
 * `@kbn/i18n`.
 *
 * @param repoRoot - The root directory of the Kibana repository
 * @param options - Optional configuration
 * @returns An object mapping package IDs to their absolute paths
 */
export function generateKbnAliases(
  repoRoot: string,
  options?: GenerateKbnAliasesOptions
): Record<string, string> {
  if (!repoRoot) {
    throw new Error(
      `generateKbnAliases requires a valid repoRoot, but received: ${JSON.stringify(repoRoot)}`
    );
  }

  const { preferBrowser = false } = options ?? {};
  const packageMap = readPackageMap(repoRoot);
  const aliases: Record<string, string> = {};

  // Sort by key length descending to prevent prefix collisions in
  // Vite's startsWith-based alias matching. JS object iteration
  // preserves insertion order for string keys.
  const sorted = [...packageMap.entries()].sort((a, b) => b[0].length - a[0].length);

  for (const [pkgId, relDir] of sorted) {
    const absolutePkgDir = Path.resolve(repoRoot, relDir);

    if (preferBrowser) {
      // Check the package's package.json for a "browser" field.
      // Vite's resolve.mainFields only applies to node_modules resolution,
      // not directory aliases, so we need to resolve browser entries here.
      try {
        const pkgJsonPath = Path.join(absolutePkgDir, 'package.json');
        const pkgJson = JSON.parse(Fs.readFileSync(pkgJsonPath, 'utf8'));
        if (typeof pkgJson.browser === 'string') {
          const browserEntry = Path.resolve(absolutePkgDir, pkgJson.browser);
          aliases[pkgId] = browserEntry;
          continue;
        }
      } catch {
        // No package.json or parse error — fall through to directory alias
      }
    }

    aliases[pkgId] = absolutePkgDir;
  }

  return aliases;
}

export interface KbnResolverPluginOptions {
  /**
   * The root directory of the Kibana repository
   */
  repoRoot: string;

  /**
   * Additional aliases to add (will be merged with @kbn/* aliases)
   */
  additionalAliases?: Record<string, string>;

  /**
   * When true, check each package's package.json for a "browser" field
   * and prefer it over the default entry point. Use this for browser
   * builds where packages like @kbn/i18n have separate browser entries
   * that exclude Node.js-only modules (e.g. fs/promises).
   */
  preferBrowser?: boolean;
}

/**
 * Resolve a target path to an existing file on disk, trying common extensions
 * and index files. Uses fs.statSync which is orders of magnitude faster than
 * going through the Vite plugin resolution chain via this.resolve().
 */
const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];

function resolveFileOnDisk(targetPath: string): string | null {
  // 1. Exact path (might be a file already)
  try {
    if (Fs.statSync(targetPath).isFile()) return targetPath;
  } catch {
    // not a file — continue
  }

  // 2. Try appending extensions
  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = targetPath + ext;
    try {
      if (Fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // continue
    }
  }

  // 3. Try index files inside the directory
  for (const ext of RESOLVE_EXTENSIONS) {
    const candidate = Path.join(targetPath, `index${ext}`);
    try {
      if (Fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // continue
    }
  }

  return null;
}

/**
 * Cache of package.json entry points. Keyed by `${absolutePkgDir}:${preferBrowser}`.
 * Value is the resolved entry file path, or null if not determinable.
 */
const pkgEntryCache = new Map<string, string | null>();

function resolvePackageEntry(
  absolutePkgDir: string,
  options?: { preferBrowser?: boolean }
): string | null {
  const preferBrowser = options?.preferBrowser ?? false;
  const cacheKey = `${absolutePkgDir}:${preferBrowser}`;

  if (pkgEntryCache.has(cacheKey)) {
    return pkgEntryCache.get(cacheKey)!;
  }

  // Try reading the package's package.json for its entry point
  const pkgJsonPath = Path.join(absolutePkgDir, 'package.json');
  try {
    const pkgJson = JSON.parse(Fs.readFileSync(pkgJsonPath, 'utf8'));

    // When preferBrowser is true, check the "browser" field first.
    // Packages like @kbn/i18n use this field to provide a browser-safe
    // entry point that excludes Node.js-only modules (e.g. fs/promises).
    if (preferBrowser && typeof pkgJson.browser === 'string') {
      const browserPath = Path.resolve(absolutePkgDir, pkgJson.browser);
      const resolved = resolveFileOnDisk(browserPath);
      if (resolved) {
        pkgEntryCache.set(cacheKey, resolved);
        return resolved;
      }
    }

    // Prefer: exports["."] > main > module, then fall back to index resolution
    const exportsEntry =
      pkgJson.exports?.['.']?.import ?? pkgJson.exports?.['.']?.default ?? pkgJson.exports?.['.'];
    const entry = exportsEntry ?? pkgJson.main ?? pkgJson.module;
    if (entry && typeof entry === 'string') {
      const entryPath = Path.resolve(absolutePkgDir, entry);
      try {
        if (Fs.statSync(entryPath).isFile()) {
          pkgEntryCache.set(cacheKey, entryPath);
          return entryPath;
        }
      } catch {
        // entry path doesn't exist, fall through
      }
    }
  } catch {
    // no package.json or parse error
  }

  // Fall back to index file resolution
  const resolved = resolveFileOnDisk(absolutePkgDir);
  pkgEntryCache.set(cacheKey, resolved);
  return resolved;
}

/**
 * Vite plugin that resolves @kbn/* imports using the Kibana package map.
 * This is the Vite equivalent of the import resolver used by webpack and Jest.
 *
 * Performance: uses direct fs.statSync() for file resolution instead of
 * this.resolve() to avoid going through the entire Vite plugin chain
 * (which was causing 15-40% of total build time).
 */
export function kbnResolverPlugin(options: KbnResolverPluginOptions): Plugin {
  const { repoRoot, additionalAliases: _additionalAliases = {}, preferBrowser = false } = options;

  if (!repoRoot) {
    throw new Error(
      `kbnResolverPlugin requires a valid repoRoot option, but received: ${JSON.stringify(
        repoRoot
      )}`
    );
  }

  let packageMap: Map<string, string>;

  // Cache resolved paths. Keyed by raw import source (e.g. '@kbn/i18n/react').
  const resolveCache = new Map<string, string | null>();

  return {
    name: 'kbn-resolver',

    configResolved(_resolvedConfig) {
      packageMap = readPackageMap(repoRoot);
    },

    resolveId: {
      order: 'pre',
      handler(source, _importer, _resolveOptions) {
        // Skip if not a @kbn/* import
        if (!source.startsWith('@kbn/')) {
          return null;
        }

        // Check the cache first — same source always resolves the same way
        if (resolveCache.has(source)) {
          const cached = resolveCache.get(source);
          return cached ? { id: cached } : null;
        }

        // Parse the import request to extract package ID and sub-path
        const parts = source.split('/');
        const pkgId = `${parts[0]}/${parts[1]}`; // @kbn/package-name
        const subPath = parts.slice(2).join('/');

        // Look up the package directory
        const pkgDir = packageMap.get(pkgId);
        if (!pkgDir) {
          // Not in the package map — let Vite handle it (might be in node_modules)
          resolveCache.set(source, null);
          return null;
        }

        const absolutePkgDir = Path.resolve(repoRoot, pkgDir);
        let resolved: string | null;

        if (subPath) {
          // Sub-path import: @kbn/foo/bar → resolve <pkgDir>/bar with extensions
          resolved = resolveFileOnDisk(Path.join(absolutePkgDir, subPath));
        } else {
          // Bare import: @kbn/foo → resolve via package.json entry or index
          resolved = resolvePackageEntry(absolutePkgDir, { preferBrowser });
        }

        resolveCache.set(source, resolved);
        return resolved ? { id: resolved } : null;
      },
    },
  };
}

/**
 * Adapts legacy Kibana import paths to their modern equivalents.
 * Handles paths like 'kibana/public', 'kibana/server', and root-relative paths.
 */
export function kbnLegacyImportsPlugin(options: { repoRoot: string }): Plugin {
  const { repoRoot } = options;

  if (!repoRoot) {
    throw new Error(
      `kbnLegacyImportsPlugin requires a valid repoRoot option, but received: ${JSON.stringify(
        repoRoot
      )}`
    );
  }

  return {
    name: 'kbn-legacy-imports',

    resolveId: {
      order: 'pre',
      async handler(source, importer, resolveOptions) {
        // Handle legacy typescript aliases
        if (source === 'kibana/public') {
          return this.resolve(Path.resolve(repoRoot, 'src/core/public'), importer, {
            ...resolveOptions,
            skipSelf: true,
          });
        }

        if (source === 'kibana/server') {
          return this.resolve(Path.resolve(repoRoot, 'src/core/server'), importer, {
            ...resolveOptions,
            skipSelf: true,
          });
        }

        // Handle root-relative paths (src/, x-pack/, examples/, test/)
        if (
          source.startsWith('src/') ||
          source.startsWith('x-pack/') ||
          source.startsWith('examples/') ||
          source.startsWith('test/')
        ) {
          return this.resolve(Path.resolve(repoRoot, source), importer, {
            ...resolveOptions,
            skipSelf: true,
          });
        }

        return null;
      },
    },
  };
}

/**
 * Handles special module adaptations similar to the webpack import resolver.
 * This includes modules like zod, vega-lite, @modelcontextprotocol/sdk, etc.
 */
export function kbnSpecialModulesPlugin(options: { repoRoot: string }): Plugin {
  const { repoRoot } = options;

  if (!repoRoot) {
    throw new Error(
      `kbnSpecialModulesPlugin requires a valid repoRoot option, but received: ${JSON.stringify(
        repoRoot
      )}`
    );
  }

  return {
    name: 'kbn-special-modules',

    resolveId: {
      order: 'pre',
      async handler(source, importer, resolveOptions) {
        // Handle @modelcontextprotocol/sdk
        if (source.startsWith('@modelcontextprotocol/sdk')) {
          const relPath = source.split('@modelcontextprotocol/sdk')[1] || '';
          const targetPath = Path.resolve(
            repoRoot,
            `node_modules/@modelcontextprotocol/sdk/dist/esm${relPath}`
          );
          return this.resolve(targetPath, importer, {
            ...resolveOptions,
            skipSelf: true,
          });
        }

        // Handle @elastic/eui imports - redirect to test-env
        if (source === '@elastic/eui') {
          return this.resolve(
            Path.resolve(repoRoot, 'node_modules/@elastic/eui/test-env/index.js'),
            importer,
            { ...resolveOptions, skipSelf: true }
          );
        }
        if (source.startsWith('@elastic/eui/lib/')) {
          const subPath = source.replace('@elastic/eui/lib/', '');
          return this.resolve(
            Path.resolve(repoRoot, `node_modules/@elastic/eui/test-env/${subPath}`),
            importer,
            { ...resolveOptions, skipSelf: true }
          );
        }
        if (source.startsWith('@elastic/eui/')) {
          // Handle other @elastic/eui subpaths
          const subPath = source.replace('@elastic/eui/', '');
          return this.resolve(
            Path.resolve(repoRoot, `node_modules/@elastic/eui/${subPath}`),
            importer,
            { ...resolveOptions, skipSelf: true }
          );
        }

        // Handle zod v3/v4 migration
        if (source.startsWith('zod/v4')) {
          return Path.resolve(repoRoot, 'node_modules/zod/v4/index.cjs');
        }
        if (source === 'zod' || source.startsWith('zod/v3')) {
          return Path.resolve(repoRoot, 'node_modules/zod/v3/index.cjs');
        }

        // Handle vega-lite
        if (source.startsWith('vega-lite')) {
          return this.resolve(Path.resolve(repoRoot, 'node_modules/vega-lite/build'), importer, {
            ...resolveOptions,
            skipSelf: true,
          });
        }

        // Handle vega-tooltip
        if (source.startsWith('vega-tooltip')) {
          return this.resolve(Path.resolve(repoRoot, 'node_modules/vega-tooltip/build'), importer, {
            ...resolveOptions,
            skipSelf: true,
          });
        }

        return null;
      },
    },
  };
}
