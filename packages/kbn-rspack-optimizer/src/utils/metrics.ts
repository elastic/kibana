/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { Stats, StatsCompilation } from '@rspack/core';
import type { PluginEntry } from '../types';

export interface BundleMetric {
  group: string;
  id: string;
  value: number;
  limit?: number;
  limitConfigPath?: string;
}

export interface CollectMetricsOptions {
  plugins: PluginEntry[];
  limitsPath?: string;
}

/**
 * Collect bundle metrics from RSPack stats for CI reporting
 */
export function collectBundleMetrics(
  stats: Stats,
  options: CollectMetricsOptions
): BundleMetric[] {
  const { plugins, limitsPath } = options;
  const metrics: BundleMetric[] = [];
  const statsJson = stats.toJson({
    assets: true,
    chunks: true,
    modules: true,
  });

  for (const plugin of plugins) {
    if (plugin.ignoreMetrics) {
      continue;
    }

    const pluginMetrics = collectPluginMetrics(plugin, statsJson, limitsPath);
    metrics.push(...pluginMetrics);
  }

  return metrics;
}

function collectPluginMetrics(
  plugin: PluginEntry,
  stats: StatsCompilation,
  limitsPath?: string
): BundleMetric[] {
  const metrics: BundleMetric[] = [];
  const assets = stats.assets ?? [];

  // Find entry file for this plugin
  const entryPattern = new RegExp(`^${escapeRegex(plugin.id)}\\.(plugin|entry)\\.js$`);
  const entryAsset = assets.find((a) => entryPattern.test(a.name));

  if (!entryAsset) {
    // Plugin may not have been built (filtered out)
    return metrics;
  }

  // Find async chunks for this plugin
  const chunkPattern = new RegExp(`^${escapeRegex(plugin.id)}\\.chunk\\..+\\.js$`);
  const asyncChunks = assets.filter((a) => chunkPattern.test(a.name));

  // Find misc assets (CSS, fonts, images)
  const miscPattern = new RegExp(`^${escapeRegex(plugin.id)}\\..+(?<!\\.(js|map))$`);
  const miscAssets = assets.filter(
    (a) => miscPattern.test(a.name) && !a.name.endsWith('.js') && !a.name.endsWith('.map')
  );

  // Count modules for this plugin
  const moduleCount = countPluginModules(plugin, stats);

  // Page load bundle size (entry only)
  metrics.push({
    group: 'page load bundle size',
    id: plugin.id,
    value: entryAsset.size,
    limit: plugin.pageLoadAssetSizeLimit,
    limitConfigPath: limitsPath,
  });

  // Module count
  metrics.push({
    group: '@kbn/rspack-optimizer bundle module count',
    id: plugin.id,
    value: moduleCount,
  });

  // Async chunks size
  const asyncChunksSize = asyncChunks.reduce((sum, a) => sum + a.size, 0);
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
  const miscAssetsSize = miscAssets.reduce((sum, a) => sum + a.size, 0);
  metrics.push({
    group: 'miscellaneous assets size',
    id: plugin.id,
    value: miscAssetsSize,
  });

  return metrics;
}

function countPluginModules(plugin: PluginEntry, stats: StatsCompilation): number {
  const modules = stats.modules ?? [];
  let count = 0;

  for (const mod of modules) {
    const identifier = mod.identifier ?? mod.name ?? '';
    // Check if module belongs to this plugin
    if (identifier.includes(plugin.contextDir) || identifier.includes(plugin.id)) {
      count++;
    }
  }

  return count;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format metrics as a table for logging
 */
export function formatMetricsTable(metrics: BundleMetric[]): string {
  const byGroup = new Map<string, BundleMetric[]>();

  for (const metric of metrics) {
    const group = byGroup.get(metric.group) ?? [];
    group.push(metric);
    byGroup.set(metric.group, group);
  }

  const lines: string[] = [];

  for (const [group, groupMetrics] of byGroup) {
    lines.push(`\n${group}:`);
    lines.push('-'.repeat(60));

    for (const metric of groupMetrics.sort((a, b) => a.id.localeCompare(b.id))) {
      const value = formatBytes(metric.value);
      const limit = metric.limit ? ` (limit: ${formatBytes(metric.limit)})` : '';
      const status = metric.limit && metric.value > metric.limit ? ' ⚠️ OVER LIMIT' : '';
      lines.push(`  ${metric.id}: ${value}${limit}${status}`);
    }
  }

  return lines.join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
