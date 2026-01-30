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
import type { Compiler, Compilation, RspackPluginInstance, Asset } from '@rspack/core';
import type { PluginEntry } from '../types';

const PLUGIN_NAME = 'OutputRouterPlugin';

/**
 * RSPack plugin that routes output assets to per-plugin directories
 *
 * Instead of outputting all files to a single directory, this plugin
 * moves each plugin's assets to its target/public directory, matching
 * the expected output structure of @kbn/optimizer
 */
export class OutputRouterPlugin implements RspackPluginInstance {
  private pluginMap: Map<string, PluginEntry>;

  constructor(
    private plugins: PluginEntry[],
    private outputRoot: string
  ) {
    this.pluginMap = new Map(plugins.map((p) => [p.id, p]));
  }

  apply(compiler: Compiler): void {
    // Hook into asset emission to route files
    compiler.hooks.afterEmit.tapAsync(PLUGIN_NAME, async (compilation, callback) => {
      try {
        await this.routeAssets(compilation);
        callback();
      } catch (error) {
        callback(error as Error);
      }
    });
  }

  private async routeAssets(compilation: Compilation): Promise<void> {
    const outputPath = compilation.outputOptions.path;
    if (!outputPath) return;

    const assets = compilation.getAssets();

    for (const asset of assets) {
      const targetDir = this.resolveTargetDir(asset.name);
      if (!targetDir) continue;

      const sourcePath = Path.resolve(outputPath, asset.name);
      const targetPath = Path.resolve(targetDir, this.getTargetFilename(asset.name));

      // Ensure target directory exists
      await Fs.promises.mkdir(Path.dirname(targetPath), { recursive: true });

      // Copy the file
      try {
        await Fs.promises.copyFile(sourcePath, targetPath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // Source might not exist if it was already moved
      }
    }

    // Clean up intermediate output directory
    // (Leave it for now in case of debugging needs)
  }

  private resolveTargetDir(filename: string): string | null {
    // Parse filename to determine which plugin it belongs to
    // Patterns:
    //   {pluginId}.plugin.js
    //   {pluginId}.entry.js
    //   {pluginId}.chunk.{id}.js
    //   chunks/{name}.[hash].js

    // Extract plugin ID from filename
    const pluginIdMatch = filename.match(/^([^.]+)\.(plugin|entry|chunk)/);
    if (pluginIdMatch) {
      const pluginId = pluginIdMatch[1];
      const plugin = this.pluginMap.get(pluginId);
      if (plugin) {
        return plugin.outputDir;
      }
    }

    // Shared chunks go to a common location
    if (filename.startsWith('chunks/')) {
      return Path.resolve(this.outputRoot, 'target/public/chunks');
    }

    return null;
  }

  private getTargetFilename(filename: string): string {
    // Remove chunks/ prefix if present
    if (filename.startsWith('chunks/')) {
      return Path.basename(filename);
    }

    return filename;
  }
}
