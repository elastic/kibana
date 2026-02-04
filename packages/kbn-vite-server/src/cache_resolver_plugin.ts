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

interface CacheManifest {
  version: number;
  created: string;
  nodeVersion: string;
  packages: Record<
    string,
    {
      packageId: string;
      packageDir: string;
      hash: string;
      outputDir: string;
      files: string[];
      transpileTime: number;
    }
  >;
}

interface CacheResolverOptions {
  /** Path to the repository root */
  repoRoot: string;
  /** Path to the transpile cache directory (default: .transpile-cache) */
  cacheDir?: string;
  /** Whether to enable verbose logging */
  verbose?: boolean;
  /** If true, skip cache and always use source (for debugging) */
  disabled?: boolean;
}

/**
 * Known @kbn/* packages that are CommonJS and must be externalized.
 * These packages use require()/module.exports and cannot be transformed by Vite's ESM runner.
 */
const COMMONJS_KBN_PACKAGES = [
  // Note: @kbn/repo-info was converted to ESM
  // Note: @kbn/babel-register was removed from the codebase
  '@kbn/repo-packages',
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
 * CommonJS node_modules packages that must be externalized.
 * These use require() internally and break when transformed by Vite.
 */
const COMMONJS_NODE_MODULES = ['lodash', 'moment', 'moment-timezone', 'joi'];

/**
 * Vite plugin that resolves @kbn/* packages from the transpile cache
 * when available, falling back to source files otherwise.
 *
 * This significantly speeds up dev server startup by using pre-transpiled
 * JavaScript files instead of on-the-fly TypeScript transpilation.
 *
 * Usage:
 * ```ts
 * import { kbnCacheResolverPlugin } from '@kbn/vite-server';
 *
 * // In your Vite config
 * plugins: [
 *   kbnCacheResolverPlugin({ repoRoot: '/path/to/kibana' }),
 *   // ... other plugins
 * ]
 * ```
 */
export function kbnCacheResolverPlugin(options: CacheResolverOptions): Plugin {
  const { repoRoot, verbose = false, disabled = false } = options;
  const cacheDir = options.cacheDir || Path.resolve(repoRoot, '.transpile-cache');
  const manifestPath = Path.resolve(cacheDir, 'manifest.json');

  let manifest: CacheManifest | null = null;
  let packageMap: Map<string, string> | null = null; // packageId -> relative dir

  // Load the cache manifest
  function loadManifest(): CacheManifest | null {
    if (!Fs.existsSync(manifestPath)) {
      if (verbose) {
        console.log('[kbn-cache-resolver] No cache manifest found at', manifestPath);
      }
      return null;
    }

    try {
      const content = Fs.readFileSync(manifestPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('[kbn-cache-resolver] Failed to load cache manifest:', error);
      return null;
    }
  }

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
      console.warn('[kbn-cache-resolver] Failed to load package map:', error);
      return new Map();
    }
  }

  // Check if a cached version exists for a package
  function getCachedPath(packageId: string, subpath: string = ''): string | null {
    if (!manifest || !packageMap) {
      return null;
    }

    const cachedPackage = manifest.packages[packageId];
    if (!cachedPackage) {
      return null;
    }

    // Get the cached output directory
    const cachedDir = Path.resolve(cacheDir, cachedPackage.outputDir);

    // Determine the file to resolve
    let targetFile: string;
    if (subpath) {
      // Subpath import: @kbn/foo/bar -> .transpile-cache/.../bar.js
      targetFile = Path.resolve(cachedDir, subpath.replace(/\.(ts|tsx)$/, '.js'));
      if (!targetFile.endsWith('.js')) {
        targetFile += '.js';
      }
    } else {
      // Main entry: @kbn/foo -> .transpile-cache/.../index.js
      targetFile = Path.resolve(cachedDir, 'index.js');
    }

    // Check if the cached file exists
    if (Fs.existsSync(targetFile)) {
      return targetFile;
    }

    // Try without adding .js (might already have extension)
    if (subpath && !subpath.endsWith('.js')) {
      const altFile = Path.resolve(cachedDir, subpath);
      if (Fs.existsSync(altFile)) {
        return altFile;
      }
    }

    return null;
  }

  return {
    name: 'kbn-cache-resolver',
    enforce: 'pre', // Run before other resolvers

    buildStart() {
      if (disabled) {
        if (verbose) {
          console.log('[kbn-cache-resolver] Plugin disabled, using source files');
        }
        return;
      }

      // Load manifest and package map on build start
      manifest = loadManifest();
      packageMap = loadPackageMap();

      if (manifest) {
        const cachedCount = Object.keys(manifest.packages).length;
        console.log(`[kbn-cache-resolver] Loaded cache with ${cachedCount} packages`);
      } else {
        console.log('[kbn-cache-resolver] No cache available, using source files');
        console.log('[kbn-cache-resolver] Run "yarn transpile" to create the cache');
      }
    },

    resolveId(source, importer, options) {
      // Check if this is a known CommonJS node_modules package
      // Mark with a special prefix so the load hook can handle it
      const basePackage = source.startsWith('@')
        ? source.split('/').slice(0, 2).join('/')
        : source.split('/')[0];

      if (COMMONJS_NODE_MODULES.includes(basePackage)) {
        if (verbose) {
          console.log(`[kbn-cache-resolver] CommonJS node_module: ${source}`);
        }
        // Use virtual module approach - prefix with \0 to mark as virtual
        return `\0cjs-external:${source}`;
      }

      // Only handle @kbn/* imports from here
      if (!source.startsWith('@kbn/')) {
        return null;
      }

      // Parse the import: @kbn/foo or @kbn/foo/bar/baz
      const parts = source.split('/');
      const packageId = `${parts[0]}/${parts[1]}`; // @kbn/package-name
      const subpath = parts.slice(2).join('/'); // bar/baz or empty

      // Check if this is a known CommonJS @kbn package
      if (COMMONJS_KBN_PACKAGES.includes(packageId)) {
        if (verbose) {
          console.log(`[kbn-cache-resolver] CommonJS @kbn package: ${source}`);
        }
        // Use virtual module approach
        return `\0cjs-external:${source}`;
      }

      if (disabled || !manifest) {
        return null; // Fall through to other resolvers
      }

      // Check if we have a cached version
      const cachedPath = getCachedPath(packageId, subpath);

      if (cachedPath) {
        if (verbose) {
          console.log(`[kbn-cache-resolver] ${source} -> ${Path.relative(repoRoot, cachedPath)}`);
        }
        return cachedPath;
      }

      // No cache hit, let other resolvers handle it
      if (verbose) {
        console.log(`[kbn-cache-resolver] Cache miss for ${source}`);
      }
      return null;
    },

    // Load hook to handle CommonJS external modules
    async load(id) {
      if (!id.startsWith('\0cjs-external:')) {
        return null;
      }

      const moduleName = id.slice('\0cjs-external:'.length);
      if (verbose) {
        console.log(`[kbn-cache-resolver] Loading CJS external: ${moduleName}`);
      }

      // For CommonJS modules, we need to load them via createRequire
      // and generate ESM export statements for each export
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const mod = require(moduleName);

        // Get all export names from the module
        const exportNames = Object.keys(mod).filter(
          (key) =>
            key !== 'default' && key !== '__esModule' && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
        );

        // Generate the ESM wrapper code
        const code = `
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const _mod = _require('${moduleName}');
export default _mod;
${exportNames.map((name) => `export const ${name} = _mod['${name}'];`).join('\n')}
`;
        return code;
      } catch (error) {
        console.error(`[kbn-cache-resolver] Failed to load CJS module ${moduleName}:`, error);
        return null;
      }
    },
  };
}
