/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Compiler, RspackPluginInstance, NormalModuleFactory } from '@rspack/core';
import { parseKbnImportReq } from '@kbn/repo-packages';
import type { PluginEntry, BundleRemote } from '../types';

const PLUGIN_NAME = 'KbnBundleRefsPlugin';

/**
 * RSPack plugin that transforms cross-plugin imports to __kbnBundles__ references
 *
 * When a plugin imports from another plugin (e.g., `import { something } from '@kbn/data-plugin/public'`),
 * this plugin intercepts the import and transforms it to a runtime reference via __kbnBundles__.get()
 */
export class KbnBundleRefsPlugin implements RspackPluginInstance {
  private remotes: Map<string, BundleRemote>;
  private pluginAllowedDeps: Map<string, Set<string>>;

  constructor(private plugins: PluginEntry[]) {
    // Build lookup map: pkgId -> BundleRemote
    this.remotes = new Map();
    for (const plugin of plugins) {
      this.remotes.set(plugin.pkgId, {
        bundleType: plugin.type,
        bundleId: plugin.id,
        pkgId: plugin.pkgId,
        targets: plugin.targets,
      });
    }

    // Build allowed deps map for each plugin
    this.pluginAllowedDeps = new Map();
    for (const plugin of plugins) {
      const allowed = new Set([
        'core', // Core is always allowed
        ...plugin.requiredPlugins,
        ...plugin.requiredBundles,
      ]);
      this.pluginAllowedDeps.set(plugin.id, allowed);
    }
  }

  apply(compiler: Compiler): void {
    compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, (nmf: NormalModuleFactory) => {
      // Hook into module resolution
      nmf.hooks.beforeResolve.tap(PLUGIN_NAME, (resolveData) => {
        if (!resolveData) return;

        const request = resolveData.request;

        // Skip non-kbn imports
        if (!request.startsWith('@kbn/')) {
          return;
        }

        // Skip if ends with ?raw or is a JSON file
        if (request.endsWith('?raw') || request.endsWith('.json')) {
          return;
        }

        // Parse the import request
        const parsed = parseKbnImportReq(request);
        if (!parsed) {
          return;
        }

        // Check if this is a cross-plugin import
        const remote = this.remotes.get(parsed.pkgId);
        if (!remote) {
          // Not a plugin import, let it resolve normally
          return;
        }

        // Validate the import target is public
        if (!remote.targets.includes(parsed.target)) {
          throw new Error(
            `Import "${request}" references a non-public export of bundle "${remote.bundleId}". ` +
              `Valid targets are: ${remote.targets.join(', ')}`
          );
        }

        // Transform to external - this will be resolved at runtime via __kbnBundles__
        const exportId =
          remote.bundleType === 'entry'
            ? `entry/${remote.bundleId}/${parsed.target}`
            : `plugin/${remote.bundleId}/${parsed.target}`;

        // Mark as external by modifying the request
        // RSPack will treat this as an external module
        resolveData.request = `__kbnBundles__.get('${exportId}')`;
      });
    });

    // Add validation for unused dependencies
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
        // Track which remotes were actually used by each plugin
        const usedRemotes = new Map<string, Set<string>>();

        for (const mod of modules) {
          // Check if module is from a plugin context
          const identifier = (mod as any).identifier?.() ?? '';
          for (const plugin of this.plugins) {
            if (identifier.includes(plugin.contextDir)) {
              // Found a module in this plugin
              // Check if it's a remote reference
              if (identifier.includes('__kbnBundles__')) {
                const match = identifier.match(/plugin\/([^/]+)\//);
                if (match) {
                  const used = usedRemotes.get(plugin.id) ?? new Set();
                  used.add(match[1]);
                  usedRemotes.set(plugin.id, used);
                }
              }
            }
          }
        }

        // Validate required bundles are used (warning only)
        for (const plugin of this.plugins) {
          const used = usedRemotes.get(plugin.id) ?? new Set();
          const unusedBundles = plugin.requiredBundles.filter((b) => !used.has(b));

          if (unusedBundles.length > 0) {
            compilation.warnings.push(
              new Error(
                `Plugin "${plugin.id}" declares unused requiredBundles: ${unusedBundles.join(', ')}. ` +
                  `Consider removing them from the manifest.`
              ) as any
            );
          }
        }
      });
    });
  }
}
