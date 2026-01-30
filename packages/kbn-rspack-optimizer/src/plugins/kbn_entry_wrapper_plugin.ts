/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Compiler, Compilation, RspackPluginInstance } from '@rspack/core';
import { sources } from '@rspack/core';
import type { PluginEntry } from '../types';

const PLUGIN_NAME = 'KbnEntryWrapperPlugin';

/**
 * RSPack plugin that wraps plugin entry bundles to register with __kbnBundles__
 *
 * Each plugin entry is wrapped with code that calls __kbnBundles__.define()
 * to register the plugin's exports for runtime loading
 */
export class KbnEntryWrapperPlugin implements RspackPluginInstance {
  constructor(private plugins: PluginEntry[]) {}

  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation: Compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: compilation.constructor.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets) => {
          for (const plugin of this.plugins) {
            const entryFilename = this.getEntryFilename(plugin);

            // Find the asset - it might be in a different location due to output routing
            let assetName = entryFilename;
            if (!assets[assetName]) {
              // Try to find it with different patterns
              const possibleNames = Object.keys(assets).filter(
                (name) =>
                  name.includes(plugin.id) &&
                  (name.endsWith('.plugin.js') || name.endsWith('.entry.js'))
              );
              if (possibleNames.length > 0) {
                assetName = possibleNames[0];
              }
            }

            const asset = assets[assetName];
            if (!asset) {
              continue;
            }

            // Generate wrapper code
            const wrapper = this.generateWrapper(plugin);

            // Get original source
            const originalSource = asset.source().toString();

            // Create wrapped source
            const wrappedSource = this.wrapSource(originalSource, wrapper, plugin);

            // Update the asset
            compilation.updateAsset(assetName, new sources.RawSource(wrappedSource));
          }
        }
      );
    });
  }

  private getEntryFilename(plugin: PluginEntry): string {
    return plugin.type === 'entry'
      ? `${plugin.id}.entry.js`
      : `${plugin.id}.plugin.js`;
  }

  private generateWrapper(plugin: PluginEntry): { prefix: string; suffix: string } {
    // Generate __kbnBundles__.define() calls for each target
    const defines = plugin.targets.map((target) => {
      const exportId =
        plugin.type === 'entry'
          ? `entry/${plugin.id}/${target}`
          : `plugin/${plugin.id}/${target}`;

      return `__kbnBundles__.define('${exportId}', __webpack_require__, __webpack_require__.s);`;
    });

    return {
      prefix: `(function(module, exports, __webpack_require__) {
  // Kibana bundle wrapper for ${plugin.id}
`,
      suffix: `
  // Register with __kbnBundles__
  ${defines.join('\n  ')}
})(module, exports, __webpack_require__);`,
    };
  }

  private wrapSource(source: string, wrapper: { prefix: string; suffix: string }, plugin: PluginEntry): string {
    // For RSPack output, we need to handle the IIFE format
    // The generated code typically looks like: (function() { ... })();

    // Simplified approach: prepend registration code
    const registration = this.generateRegistrationCode(plugin);

    return `${source}
// __kbnBundles__ registration
${registration}`;
  }

  private generateRegistrationCode(plugin: PluginEntry): string {
    const lines: string[] = [];

    for (const target of plugin.targets) {
      const exportId =
        plugin.type === 'entry'
          ? `entry/${plugin.id}/${target}`
          : `plugin/${plugin.id}/${target}`;

      // The module should export from the entry point
      // We'll use the webpack runtime to get the module
      lines.push(
        `if (typeof __kbnBundles__ !== 'undefined') {`
      );
      lines.push(
        `  __kbnBundles__.define('${exportId}', function(key) { return __webpack_require__(key); }, __webpack_require__.s);`
      );
      lines.push(`}`);
    }

    return lines.join('\n');
  }
}
