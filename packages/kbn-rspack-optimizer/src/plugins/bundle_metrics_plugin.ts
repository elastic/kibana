/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { Compiler, Compilation, RspackPluginInstance } from '@rspack/core';
import { sources } from '@rspack/core';
import type { PluginEntry } from '../types';

const PLUGIN_NAME = 'BundleMetricsPlugin';

export interface BundleMetricsPluginOptions {
  plugins: PluginEntry[];
  limitsPath?: string;
}

interface Metric {
  group: string;
  id: string;
  value: number;
  limit?: number;
  limitConfigPath?: string;
}

/**
 * RSPack plugin that collects and emits bundle metrics for each plugin
 *
 * Metrics are written to metrics.json in each plugin's output directory
 * for CI stats collection
 */
export class BundleMetricsPlugin implements RspackPluginInstance {
  constructor(private options: BundleMetricsPluginOptions) {}

  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation: Compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: compilation.constructor.PROCESS_ASSETS_STAGE_ANALYSE,
        },
        (assets) => {
          for (const plugin of this.options.plugins) {
            if (plugin.ignoreMetrics) {
              continue;
            }

            const metrics = this.collectPluginMetrics(plugin, assets, compilation);
            if (metrics.length === 0) {
              continue;
            }

            // Emit metrics.json for this plugin
            const metricsFilename = this.getMetricsFilename(plugin);
            const metricsContent = JSON.stringify(metrics, null, 2);

            compilation.emitAsset(metricsFilename, new sources.RawSource(metricsContent));
          }
        }
      );
    });
  }

  private collectPluginMetrics(
    plugin: PluginEntry,
    assets: Record<string, any>,
    compilation: Compilation
  ): Metric[] {
    const metrics: Metric[] = [];

    // Find entry asset
    const entryPattern = new RegExp(`^${escapeRegex(plugin.id)}\\.(plugin|entry)\\.js$`);
    const entryAsset = Object.entries(assets).find(([name]) => entryPattern.test(name));

    if (!entryAsset) {
      return metrics;
    }

    const [entryName, entrySource] = entryAsset;
    const entrySize = entrySource.size();

    // Find async chunks
    const chunkPattern = new RegExp(`^${escapeRegex(plugin.id)}\\.chunk\\..+\\.js$`);
    const asyncChunks = Object.entries(assets).filter(([name]) => chunkPattern.test(name));

    // Find misc assets (CSS, fonts, etc.)
    const miscAssets = Object.entries(assets).filter(([name]) => {
      if (name.endsWith('.js') || name.endsWith('.map') || name === 'metrics.json') {
        return false;
      }
      return name.startsWith(plugin.id);
    });

    // Count modules for this plugin
    const moduleCount = this.countModules(plugin, compilation);

    // Page load bundle size
    metrics.push({
      group: 'page load bundle size',
      id: plugin.id,
      value: entrySize,
      limit: plugin.pageLoadAssetSizeLimit,
      limitConfigPath: this.options.limitsPath,
    });

    // Module count
    metrics.push({
      group: '@kbn/rspack-optimizer bundle module count',
      id: plugin.id,
      value: moduleCount,
    });

    // Async chunks size
    const asyncChunksSize = asyncChunks.reduce((sum, [, source]) => sum + source.size(), 0);
    metrics.push({
      group: 'async chunks size',
      id: plugin.id,
      value: asyncChunksSize,
    });

    // Async chunk count
    metrics.push({
      group: 'async chunk count',
      id: plugin.id,
      value: asyncChunks.length,
    });

    // Misc assets size
    const miscSize = miscAssets.reduce((sum, [, source]) => sum + source.size(), 0);
    metrics.push({
      group: 'miscellaneous assets size',
      id: plugin.id,
      value: miscSize,
    });

    return metrics;
  }

  private countModules(plugin: PluginEntry, compilation: Compilation): number {
    let count = 0;

    for (const mod of compilation.modules) {
      const identifier = (mod as any).identifier?.() ?? '';
      if (identifier.includes(plugin.contextDir)) {
        count++;
      }
    }

    return count;
  }

  private getMetricsFilename(plugin: PluginEntry): string {
    // Place metrics.json alongside the plugin entry
    return `${plugin.id}.metrics.json`;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
