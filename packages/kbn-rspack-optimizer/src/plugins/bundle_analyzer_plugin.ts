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
import type { Compiler, Stats, StatsModule, StatsChunk } from '@rspack/core';

/**
 * Plugin-level metrics
 */
export interface PluginMetrics {
  /** Plugin ID */
  pluginId: string;
  /** Total size of modules owned by this plugin (bytes) */
  ownedSize: number;
  /** Number of modules owned by this plugin */
  ownedModuleCount: number;
  /** Size of modules imported from other plugins (bytes) */
  importedSize: number;
  /** Number of modules imported from other plugins */
  importedModuleCount: number;
  /** Async chunks that contain this plugin's code */
  asyncChunks: string[];
}

/**
 * Overall bundle metrics
 */
export interface BundleMetrics {
  /** Build timestamp */
  timestamp: string;
  /** Git commit hash (if available) */
  gitHash?: string;
  /** Build mode */
  mode: 'development' | 'production';

  /** Total bundle metrics */
  total: {
    /** Main bundle size (bytes) */
    mainBundleSize: number;
    /** Main bundle size gzipped (estimated) */
    mainBundleSizeGzip: number;
    /** Total async chunks size (bytes) */
    asyncChunksSize: number;
    /** Number of async chunks */
    asyncChunkCount: number;
    /** Total module count */
    moduleCount: number;
    /** Total unique module count (after deduplication) */
    uniqueModuleCount: number;
  };

  /** Per-plugin metrics */
  plugins: Record<string, PluginMetrics>;

  /** Shared code metrics */
  shared: {
    /** Modules used by multiple plugins */
    sharedModuleCount: number;
    /** Size of shared modules (bytes) */
    sharedModuleSize: number;
    /** Deduplication savings (bytes saved by sharing) */
    deduplicationSavings: number;
  };

  /** Top largest modules for investigation */
  largestModules: Array<{
    name: string;
    size: number;
    plugin?: string;
  }>;

  /** Async chunk details */
  asyncChunks: Array<{
    name: string;
    size: number;
    modules: number;
  }>;
}

export interface BundleAnalyzerPluginOptions {
  /** Path to write metrics JSON */
  outputPath: string;
  /** Repository root for path analysis */
  repoRoot: string;
  /** Whether to fail build if budgets exceeded */
  failOnBudgetExceeded?: boolean;
  /** Budget limits */
  budgets?: {
    /** Max main bundle size (bytes) */
    maxMainBundleSize?: number;
    /** Max total async chunks size (bytes) */
    maxAsyncChunksSize?: number;
    /** Per-plugin max size (bytes) */
    maxPluginSize?: number;
  };
}

/**
 * RSPack plugin that analyzes bundle output and generates metrics.
 *
 * This plugin:
 * 1. Analyzes the final bundle stats
 * 2. Attributes modules to their owning plugins
 * 3. Calculates deduplication savings
 * 4. Generates a JSON report for CI comparison
 * 5. Optionally enforces size budgets
 */
export class BundleAnalyzerPlugin {
  private options: BundleAnalyzerPluginOptions;

  constructor(options: BundleAnalyzerPluginOptions) {
    this.options = options;
  }

  apply(compiler: Compiler) {
    compiler.hooks.done.tap('BundleAnalyzerPlugin', (stats: Stats) => {
      try {
        const metrics = this.analyzeStats(stats);
        this.writeMetrics(metrics);
        this.checkBudgets(metrics);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[BundleAnalyzerPlugin] Error analyzing bundle:', error);
      }
    });
  }

  private analyzeStats(stats: Stats): BundleMetrics {
    const statsJson = stats.toJson({
      assets: true,
      chunks: true,
      modules: true,
      reasons: false,
      source: false,
    });

    const modules = statsJson.modules || [];
    const chunks = statsJson.chunks || [];
    const assets = statsJson.assets || [];

    // Find main bundle
    const mainBundle = assets.find((a) => a.name === 'kibana.bundle.js');
    const mainBundleSize = mainBundle?.size || 0;

    // Analyze modules by plugin
    const pluginModules = new Map<string, StatsModule[]>();
    const moduleUsageCount = new Map<string, number>();

    for (const module of modules) {
      const pluginId = this.getPluginIdFromModule(module);
      if (pluginId) {
        const existing = pluginModules.get(pluginId) || [];
        existing.push(module);
        pluginModules.set(pluginId, existing);
      }

      // Track module usage for deduplication analysis
      const moduleId = module.identifier || module.name || '';
      moduleUsageCount.set(moduleId, (moduleUsageCount.get(moduleId) || 0) + 1);
    }

    // Calculate per-plugin metrics
    const plugins: Record<string, PluginMetrics> = {};
    for (const [pluginId, pluginMods] of pluginModules) {
      const ownedModules = pluginMods.filter((m) => this.isOwnedByPlugin(m, pluginId));
      const importedModules = pluginMods.filter((m) => !this.isOwnedByPlugin(m, pluginId));

      plugins[pluginId] = {
        pluginId,
        ownedSize: ownedModules.reduce((sum, m) => sum + (m.size || 0), 0),
        ownedModuleCount: ownedModules.length,
        importedSize: importedModules.reduce((sum, m) => sum + (m.size || 0), 0),
        importedModuleCount: importedModules.length,
        asyncChunks: this.getAsyncChunksForPlugin(pluginId, chunks),
      };
    }

    // Calculate shared module metrics
    const sharedModules = modules.filter((m) => {
      const id = m.identifier || m.name || '';
      return (moduleUsageCount.get(id) || 0) > 1;
    });

    const sharedModuleSize = sharedModules.reduce((sum, m) => sum + (m.size || 0), 0);
    const deduplicationSavings = sharedModules.reduce((sum, m) => {
      const id = m.identifier || m.name || '';
      const usageCount = moduleUsageCount.get(id) || 1;
      // Savings = size * (usageCount - 1) because we only need one copy
      return sum + (m.size || 0) * (usageCount - 1);
    }, 0);

    // Async chunks
    const asyncChunks = chunks
      .filter((c) => !c.initial)
      .map((c) => ({
        name: c.names?.[0] || c.id?.toString() || 'unknown',
        size: c.size || 0,
        modules: c.modules?.length || 0,
      }))
      .sort((a, b) => b.size - a.size);

    // Largest modules
    const largestModules = [...modules]
      .sort((a, b) => (b.size || 0) - (a.size || 0))
      .slice(0, 50)
      .map((m) => ({
        name: this.getModuleDisplayName(m),
        size: m.size || 0,
        plugin: this.getPluginIdFromModule(m),
      }));

    return {
      timestamp: new Date().toISOString(),
      gitHash: process.env.GIT_COMMIT || undefined,
      mode: statsJson.mode as 'development' | 'production' || 'development',
      total: {
        mainBundleSize,
        mainBundleSizeGzip: Math.round(mainBundleSize * 0.3), // Rough estimate
        asyncChunksSize: asyncChunks.reduce((sum, c) => sum + c.size, 0),
        asyncChunkCount: asyncChunks.length,
        moduleCount: modules.length,
        uniqueModuleCount: new Set(modules.map((m) => m.identifier || m.name)).size,
      },
      plugins,
      shared: {
        sharedModuleCount: sharedModules.length,
        sharedModuleSize,
        deduplicationSavings,
      },
      largestModules,
      asyncChunks: asyncChunks.slice(0, 20), // Top 20 async chunks
    };
  }

  private getPluginIdFromModule(module: StatsModule): string | undefined {
    const name = module.name || module.identifier || '';

    // Match plugin paths
    // x-pack/plugins/{pluginId}/
    // x-pack/platform/plugins/{group}/{pluginId}/
    // x-pack/solutions/{solution}/plugins/{pluginId}/
    // src/plugins/{pluginId}/
    // src/platform/plugins/{pluginId}/

    const patterns = [
      /x-pack\/plugins\/([^/]+)\//,
      /x-pack\/platform\/plugins\/[^/]+\/([^/]+)\//,
      /x-pack\/solutions\/[^/]+\/plugins\/([^/]+)\//,
      /src\/plugins\/([^/]+)\//,
      /src\/platform\/plugins\/([^/]+)\//,
      /src\/core\//,
    ];

    for (const pattern of patterns) {
      const match = name.match(pattern);
      if (match) {
        return match[1] || 'core';
      }
    }

    // Node modules
    if (name.includes('node_modules')) {
      return 'node_modules';
    }

    return undefined;
  }

  private isOwnedByPlugin(module: StatsModule, pluginId: string): boolean {
    const name = module.name || module.identifier || '';
    return name.includes(`/${pluginId}/`);
  }

  private getAsyncChunksForPlugin(pluginId: string, chunks: StatsChunk[]): string[] {
    return chunks
      .filter((c) => !c.initial)
      .filter((c) => {
        const modules = c.modules || [];
        return modules.some((m) => {
          const name = m.name || m.identifier || '';
          return name.includes(`/${pluginId}/`);
        });
      })
      .map((c) => c.names?.[0] || c.id?.toString() || 'unknown');
  }

  private getModuleDisplayName(module: StatsModule): string {
    const name = module.name || module.identifier || 'unknown';
    // Shorten long paths
    return name.length > 100 ? '...' + name.slice(-97) : name;
  }

  private writeMetrics(metrics: BundleMetrics): void {
    const outputDir = Path.dirname(this.options.outputPath);
    if (!Fs.existsSync(outputDir)) {
      Fs.mkdirSync(outputDir, { recursive: true });
    }

    Fs.writeFileSync(this.options.outputPath, JSON.stringify(metrics, null, 2));

    // Also write a summary
    const summary = this.generateSummary(metrics);
    const summaryPath = this.options.outputPath.replace('.json', '-summary.txt');
    Fs.writeFileSync(summaryPath, summary);

    // eslint-disable-next-line no-console
    console.log(`[BundleAnalyzerPlugin] Metrics written to ${this.options.outputPath}`);
    // eslint-disable-next-line no-console
    console.log(summary);
  }

  private generateSummary(metrics: BundleMetrics): string {
    const formatSize = (bytes: number) => {
      if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
      if (bytes > 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${bytes} B`;
    };

    const lines = [
      '========================================',
      '  RSPack Bundle Metrics Summary',
      '========================================',
      '',
      `Build Mode: ${metrics.mode}`,
      `Timestamp: ${metrics.timestamp}`,
      metrics.gitHash ? `Git Hash: ${metrics.gitHash}` : '',
      '',
      '--- Total ---',
      `Main Bundle: ${formatSize(metrics.total.mainBundleSize)} (≈${formatSize(metrics.total.mainBundleSizeGzip)} gzip)`,
      `Async Chunks: ${formatSize(metrics.total.asyncChunksSize)} (${metrics.total.asyncChunkCount} chunks)`,
      `Modules: ${metrics.total.moduleCount} (${metrics.total.uniqueModuleCount} unique)`,
      '',
      '--- Deduplication ---',
      `Shared Modules: ${metrics.shared.sharedModuleCount}`,
      `Deduplication Savings: ${formatSize(metrics.shared.deduplicationSavings)}`,
      '',
      '--- Top 10 Largest Plugins ---',
      ...Object.values(metrics.plugins)
        .sort((a, b) => b.ownedSize - a.ownedSize)
        .slice(0, 10)
        .map((p, i) => `  ${i + 1}. ${p.pluginId}: ${formatSize(p.ownedSize)} (${p.ownedModuleCount} modules)`),
      '',
      '--- Top 10 Largest Async Chunks ---',
      ...metrics.asyncChunks
        .slice(0, 10)
        .map((c, i) => `  ${i + 1}. ${c.name}: ${formatSize(c.size)}`),
      '',
      '========================================',
    ];

    return lines.filter(Boolean).join('\n');
  }

  private checkBudgets(metrics: BundleMetrics): void {
    const { budgets, failOnBudgetExceeded } = this.options;
    if (!budgets) return;

    const violations: string[] = [];

    if (budgets.maxMainBundleSize && metrics.total.mainBundleSize > budgets.maxMainBundleSize) {
      violations.push(
        `Main bundle size (${metrics.total.mainBundleSize}) exceeds budget (${budgets.maxMainBundleSize})`
      );
    }

    if (budgets.maxAsyncChunksSize && metrics.total.asyncChunksSize > budgets.maxAsyncChunksSize) {
      violations.push(
        `Async chunks size (${metrics.total.asyncChunksSize}) exceeds budget (${budgets.maxAsyncChunksSize})`
      );
    }

    if (budgets.maxPluginSize) {
      for (const plugin of Object.values(metrics.plugins)) {
        if (plugin.ownedSize > budgets.maxPluginSize) {
          violations.push(
            `Plugin ${plugin.pluginId} size (${plugin.ownedSize}) exceeds budget (${budgets.maxPluginSize})`
          );
        }
      }
    }

    if (violations.length > 0) {
      const message = `Budget violations:\n${violations.join('\n')}`;
      if (failOnBudgetExceeded) {
        throw new Error(message);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[BundleAnalyzerPlugin] ${message}`);
      }
    }
  }
}
