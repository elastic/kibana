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
 * Represents a remote bundle that can be imported by other bundles
 */
export interface BundleRemote {
  /**
   * The bundle ID (e.g., 'kibana', 'data', 'discover')
   */
  bundleId: string;

  /**
   * The package ID (e.g., '@kbn/core', '@kbn/data-plugin')
   */
  pkgId: string;

  /**
   * Public targets that can be imported from this bundle
   * (e.g., ['public', 'public/utils'])
   */
  targets: string[];
}

/**
 * Configuration for the bundle remotes plugin
 */
export interface KbnBundleRemotesPluginOptions {
  /**
   * Root directory of the Kibana repository
   */
  repoRoot: string;

  /**
   * The current bundle being built
   */
  bundle: {
    /**
     * Bundle ID
     */
    id: string;

    /**
     * Package ID
     */
    pkgId: string;

    /**
     * Path to the plugin manifest (kibana.json or kibana.jsonc)
     */
    manifestPath?: string;
  };

  /**
   * Map of package IDs to their bundle remotes
   */
  remotes: Map<string, BundleRemote>;

  /**
   * Whether to validate that bundle dependencies are declared
   */
  validateDependencies?: boolean;

  /**
   * Whether to externalize cross-bundle imports
   * If false, the imports will be bundled (useful for single-bundle builds)
   */
  externalize?: boolean;
}

/**
 * Parse a @kbn/* import request to extract package ID and target
 */
export function parseKbnImportReq(request: string): { pkgId: string; target: string } | null {
  if (!request.startsWith('@kbn/')) {
    return null;
  }

  const parts = request.split('/');
  if (parts.length < 2) {
    return null;
  }

  const pkgId = `${parts[0]}/${parts[1]}`;
  const target = parts.slice(2).join('/') || 'public';

  return { pkgId, target };
}

/**
 * Read bundle dependencies from a plugin manifest
 */
export function readBundleDeps(manifestPath: string): {
  explicit: string[];
  implicit: string[];
} {
  try {
    const content = Fs.readFileSync(manifestPath, 'utf8');
    // Handle JSONC (JSON with comments) by stripping comments
    const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const manifest = JSON.parse(jsonContent);

    const explicit = [...(manifest.requiredBundles || []), ...(manifest.requiredPlugins || [])];

    // Implicit dependencies that are always allowed
    const implicit = ['core', 'kibana'];

    return { explicit, implicit };
  } catch (error) {
    return { explicit: [], implicit: ['core', 'kibana'] };
  }
}

/**
 * Generate the runtime code for cross-bundle imports.
 * This code is used to load modules from other bundles at runtime.
 * @internal - Reserved for future use when implementing virtual modules
 */

function generateBundleRemoteCode(remote: BundleRemote, target: string): string {
  // Generate code that accesses the bundle registry at runtime
  const importId = `${remote.bundleId}/${target}`;

  return `
// Cross-bundle import from ${remote.pkgId}
const __kbn_bundle_remote__ = (() => {
  if (typeof __kbnBundles__ === 'undefined') {
    throw new Error(
      'Kibana bundle registry (__kbnBundles__) is not available. ' +
      'Ensure the bundle loader is initialized before importing from other bundles.'
    );
  }
  const bundle = __kbnBundles__.get('${importId}');
  if (!bundle) {
    throw new Error('Bundle "${importId}" is not loaded. Check that the plugin is enabled.');
  }
  return bundle;
})();
export default __kbn_bundle_remote__.default;
export * from '__kbn_bundle_remote__';
`;
}

/**
 * Vite plugin that handles cross-bundle imports between Kibana plugins.
 *
 * This is the Vite equivalent of the BundleRemotesPlugin from @kbn/optimizer.
 * It:
 * 1. Intercepts imports to other plugin bundles
 * 2. Validates that the importing bundle declares the dependency
 * 3. Validates that the import targets a public export
 * 4. Externalizes the import for runtime resolution via __kbnBundles__
 */
export function kbnBundleRemotesPlugin(options: KbnBundleRemotesPluginOptions): Plugin {
  const {
    repoRoot: _repoRoot,
    bundle,
    remotes,
    validateDependencies = true,
    externalize = true,
  } = options;

  let allowedBundleIds: Set<string>;
  const usedBundleIds = new Set<string>();

  return {
    name: 'kbn-bundle-remotes',

    configResolved(_resolvedConfig) {
      // Read allowed dependencies from manifest
      if (bundle.manifestPath && Fs.existsSync(bundle.manifestPath)) {
        const deps = readBundleDeps(bundle.manifestPath);
        allowedBundleIds = new Set([...deps.explicit, ...deps.implicit]);
      } else {
        // No manifest, allow all
        allowedBundleIds = new Set();
      }
    },

    resolveId: {
      order: 'pre',
      // Synchronous handler — this plugin does only Map lookups and string
      // comparisons. Keeping it sync avoids Promise allocation overhead on
      // every import (thousands per plugin build).
      handler(source) {
        // Fast path: skip anything that isn't @kbn/
        if (!source.startsWith('@kbn/')) {
          return null;
        }

        // Skip raw file imports
        if (source.endsWith('.json') || source.endsWith('?raw')) {
          return null;
        }

        const parsed = parseKbnImportReq(source);
        if (!parsed) {
          return null;
        }

        // Check if this is a known remote bundle
        const remote = remotes.get(parsed.pkgId);
        if (!remote) {
          // Not a remote bundle, let other resolvers handle it
          return null;
        }

        // Check if this is a self-import (same bundle)
        if (remote.bundleId === bundle.id) {
          return null; // Let normal resolution handle it
        }

        // Validate target is public
        if (
          !remote.targets.includes(parsed.target) &&
          !remote.targets.some((t) => parsed.target.startsWith(t + '/'))
        ) {
          const error =
            `Import [${source}] references a non-public export of the [${remote.bundleId}] bundle. ` +
            `Public exports are: [${remote.targets.join(', ')}]`;

          if (validateDependencies) {
            this.error(error);
          } else {
            this.warn(error);
          }
          return null;
        }

        // Validate dependency is declared
        if (
          validateDependencies &&
          allowedBundleIds.size > 0 &&
          !allowedBundleIds.has(remote.bundleId)
        ) {
          this.error(
            `Import [${source}] references the [${remote.bundleId}] bundle, ` +
              `but that bundle is not declared in "requiredPlugins" or "requiredBundles" ` +
              `in the plugin manifest [${bundle.manifestPath}]`
          );
          return null;
        }

        // Track used bundle IDs for unused dependency detection
        usedBundleIds.add(remote.bundleId);

        if (externalize) {
          // Externalize this import - it will be resolved at runtime via __kbnBundles__
          return {
            id: source,
            external: true,
            meta: {
              kbnBundleRemote: true,
              bundleId: remote.bundleId,
              pkgId: remote.pkgId,
              target: parsed.target,
            },
          };
        }

        // If not externalizing, let normal resolution handle it
        return null;
      },
    },

    // Generate virtual modules for externalized bundle remotes
    load(id) {
      // This is called for virtual modules during development
      // In production, externals are handled differently
      return null;
    },

    buildEnd() {
      // Check for unused declared dependencies
      if (validateDependencies && bundle.manifestPath && Fs.existsSync(bundle.manifestPath)) {
        const deps = readBundleDeps(bundle.manifestPath);
        const unusedDeps = deps.explicit.filter(
          (id) => !usedBundleIds.has(id) && !['core', 'kibana'].includes(id)
        );

        if (unusedDeps.length > 0) {
          this.warn(
            `Bundle [${bundle.id}] declares dependencies on [${unusedDeps.join(', ')}] ` +
              `in its manifest, but does not use them. Consider removing these from the manifest.`
          );
        }
      }
    },

    // Transform the output to handle externalized bundle remotes
    renderChunk(code, chunk) {
      const hasKbnExternals = chunk.imports.some((imp) => imp.startsWith('@kbn/'));

      if (!hasKbnExternals) {
        return null;
      }

      // Wrap the chunk to ensure __kbnBundles__ is available
      const header = `
/* Kibana bundle: ${bundle.id} */
if (typeof __kbnBundles__ === 'undefined') {
  console.warn('[${bundle.id}] Bundle registry not available, cross-bundle imports may fail');
}
`;

      return {
        code: header + code,
        map: null,
      };
    },
  };
}

/**
 * Create a map of bundle remotes from plugin packages
 */
export function createBundleRemotesMap(
  repoRoot: string,
  packages: Array<{ id: string; directory: string; manifest: any }>
): Map<string, BundleRemote> {
  const remotes = new Map<string, BundleRemote>();

  for (const pkg of packages) {
    // Only include UI plugins (those with a public directory)
    const publicDir = Path.resolve(pkg.directory, 'public');
    if (!Fs.existsSync(publicDir)) {
      continue;
    }

    const manifest = pkg.manifest;
    if (!manifest || manifest.type !== 'plugin') {
      continue;
    }

    // Determine public targets
    const targets = ['public'];
    if (manifest.extraPublicDirs) {
      targets.push(...manifest.extraPublicDirs);
    }

    const bundleId = manifest.id || pkg.id.replace('@kbn/', '').replace('-plugin', '');

    remotes.set(pkg.id, {
      bundleId,
      pkgId: pkg.id,
      targets,
    });
  }

  return remotes;
}
