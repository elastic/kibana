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

/**
 * Generate Vite-compatible aliases from the Kibana package map
 * @param repoRoot - The root directory of the Kibana repository
 * @returns An object mapping package IDs to their absolute paths
 */
export function generateKbnAliases(repoRoot: string): Record<string, string> {
  if (!repoRoot) {
    throw new Error(
      `generateKbnAliases requires a valid repoRoot, but received: ${JSON.stringify(repoRoot)}`
    );
  }

  const packageMap = readPackageMap(repoRoot);
  const aliases: Record<string, string> = {};

  for (const [pkgId, relDir] of packageMap) {
    aliases[pkgId] = Path.resolve(repoRoot, relDir);
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
}

/**
 * Vite plugin that resolves @kbn/* imports using the Kibana package map.
 * This is the Vite equivalent of the import resolver used by webpack and Jest.
 */
export function kbnResolverPlugin(options: KbnResolverPluginOptions): Plugin {
  const { repoRoot, additionalAliases: _additionalAliases = {} } = options;

  if (!repoRoot) {
    throw new Error(
      `kbnResolverPlugin requires a valid repoRoot option, but received: ${JSON.stringify(
        repoRoot
      )}`
    );
  }

  let packageMap: Map<string, string>;

  // Cache resolved paths to avoid redundant multi-step this.resolve() calls.
  // Keyed by the raw import source (e.g. '@kbn/i18n/react'), value is the
  // resolved result or null when we know it can't be resolved.
  const resolveCache = new Map<string, { id: string } | null>();

  return {
    name: 'kbn-resolver',

    configResolved(_resolvedConfig) {
      packageMap = readPackageMap(repoRoot);
    },

    resolveId: {
      order: 'pre',
      async handler(source, importer, resolveOptions) {
        // Skip if not a @kbn/* import or if it's already been processed
        if (!source.startsWith('@kbn/')) {
          return null;
        }

        // Check the cache first — same source always resolves the same way
        if (resolveCache.has(source)) {
          return resolveCache.get(source) ?? null;
        }

        // Parse the import request to extract package ID and sub-path
        const parts = source.split('/');
        const pkgId = `${parts[0]}/${parts[1]}`; // @kbn/package-name
        const subPath = parts.slice(2).join('/');

        // Look up the package directory
        const pkgDir = packageMap.get(pkgId);
        if (!pkgDir) {
          // Package not found in the map, let Vite handle it (might be a node_module)
          resolveCache.set(source, null);
          return null;
        }

        // Resolve the absolute path
        const absolutePkgDir = Path.resolve(repoRoot, pkgDir);
        const targetPath = subPath ? Path.join(absolutePkgDir, subPath) : absolutePkgDir;

        // Let Vite's default resolver handle the actual file resolution
        // This ensures proper handling of index files, extensions, etc.
        const resolved = await this.resolve(targetPath, importer, {
          ...resolveOptions,
          skipSelf: true,
        });

        if (resolved) {
          resolveCache.set(source, resolved);
          return resolved;
        }

        // If direct resolution fails, try with common extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
        for (const ext of extensions) {
          const withExt = await this.resolve(`${targetPath}${ext}`, importer, {
            ...resolveOptions,
            skipSelf: true,
          });
          if (withExt) {
            resolveCache.set(source, withExt);
            return withExt;
          }
        }

        // Try index files
        for (const ext of extensions) {
          const indexPath = await this.resolve(Path.join(targetPath, `index${ext}`), importer, {
            ...resolveOptions,
            skipSelf: true,
          });
          if (indexPath) {
            resolveCache.set(source, indexPath);
            return indexPath;
          }
        }

        resolveCache.set(source, null);
        return null;
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
