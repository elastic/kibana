/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { type Observable, Subject } from 'rxjs';
import { discoverUiPlugins, type PluginInfo } from './discover_plugins';
import { buildPlugin, type PluginBuildResult } from './build_plugin';

/**
 * Configuration for the Vite optimizer
 */
export interface OptimizerConfig {
  /**
   * Root directory of the Kibana repository
   */
  repoRoot: string;

  /**
   * Output root directory (for production builds to different location)
   * If not specified, outputs to plugin's target/public directory
   */
  outputRoot?: string;

  /**
   * Whether this is a production (distributable) build
   */
  dist: boolean;

  /**
   * Whether to watch for file changes (not yet implemented)
   */
  watch?: boolean;

  /**
   * Include example plugins
   */
  examples?: boolean;

  /**
   * Include test plugins
   */
  testPlugins?: boolean;

  /**
   * Plugin IDs to build (empty = all plugins)
   */
  pluginFilter?: string[];

  /**
   * Maximum number of parallel builds
   * Default is 4 (Vite builds are already internally parallelized)
   */
  maxWorkers?: number;

  /**
   * Theme tags to support
   */
  themeTags?: string[];
}

/**
 * Event emitted during optimization
 */
export interface OptimizerEvent {
  type: 'starting' | 'plugin-starting' | 'plugin-complete' | 'complete' | 'error';
  bundleId?: string;
  message?: string;
  progress?: {
    completed: number;
    total: number;
  };
  result?: PluginBuildResult;
  results?: PluginBuildResult[];
  totalDuration?: number;
}

/**
 * Build plugins in batches with limited parallelism
 */
async function buildPluginsInBatches(
  plugins: PluginInfo[],
  config: OptimizerConfig,
  events$: Subject<OptimizerEvent>
): Promise<PluginBuildResult[]> {
  const { repoRoot, outputRoot, dist, themeTags = ['borealislight', 'borealisdark'] } = config;
  const maxWorkers = config.maxWorkers ?? 4;
  const results: PluginBuildResult[] = [];
  let completed = 0;

  // Process plugins in batches
  for (let i = 0; i < plugins.length; i += maxWorkers) {
    const batch = plugins.slice(i, i + maxWorkers);

    const batchPromises = batch.map(async (plugin) => {
      events$.next({
        type: 'plugin-starting',
        bundleId: plugin.id,
        message: `Building ${plugin.id}...`,
      });

      // Calculate output directory
      let outputDir: string;
      if (outputRoot) {
        // For production builds, output to the build directory structure
        const relativePath = Path.relative(repoRoot, plugin.directory);
        outputDir = Path.resolve(outputRoot, relativePath, 'target/public');
      } else {
        // For development, output to plugin's own target directory
        outputDir = Path.resolve(plugin.directory, 'target/public');
      }

      const result = await buildPlugin({
        repoRoot,
        pluginDir: plugin.directory,
        manifest: {
          id: plugin.id,
          requiredPlugins: plugin.requiredPlugins,
          requiredBundles: plugin.requiredBundles,
          extraPublicDirs: plugin.extraPublicDirs,
        },
        isProduction: dist,
        outputDir,
        themeTags,
      });

      completed++;

      events$.next({
        type: 'plugin-complete',
        bundleId: plugin.id,
        message: result.success
          ? `Built ${plugin.id} in ${result.duration}ms`
          : `Failed to build ${plugin.id}: ${result.errors?.join(', ')}`,
        progress: {
          completed,
          total: plugins.length,
        },
        result,
      });

      return result;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Run the Vite-based optimizer
 *
 * This function is the main entry point for building plugin bundles.
 * It replaces the webpack-based optimizer in @kbn/optimizer.
 *
 * @param config Optimizer configuration
 * @returns Observable of optimizer events
 */
export function runOptimizer(config: OptimizerConfig): Observable<OptimizerEvent> {
  const events$ = new Subject<OptimizerEvent>();

  // Run the build asynchronously
  (async () => {
    const startTime = Date.now();

    try {
      // Discover plugins
      const plugins = discoverUiPlugins(config.repoRoot, {
        examples: config.examples,
        testPlugins: config.testPlugins,
        filter: config.pluginFilter,
      });

      if (plugins.length === 0) {
        events$.next({
          type: 'complete',
          message: 'No plugins to build',
          results: [],
          totalDuration: Date.now() - startTime,
        });
        events$.complete();
        return;
      }

      events$.next({
        type: 'starting',
        message: `Building ${plugins.length} plugins with Vite...`,
        progress: {
          completed: 0,
          total: plugins.length,
        },
      });

      // Build all plugins
      const results = await buildPluginsInBatches(plugins, config, events$);

      const totalDuration = Date.now() - startTime;
      const failedCount = results.filter((r) => !r.success).length;

      if (failedCount > 0) {
        events$.next({
          type: 'error',
          message: `Build completed with ${failedCount} error(s) in ${totalDuration}ms`,
          results,
          totalDuration,
        });
      } else {
        events$.next({
          type: 'complete',
          message: `Successfully built ${results.length} plugins in ${totalDuration}ms`,
          results,
          totalDuration,
        });
      }

      events$.complete();
    } catch (error) {
      events$.next({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
      events$.complete();
    }
  })();

  return events$.asObservable();
}

// Re-export types for convenience
export type { PluginInfo } from './discover_plugins';
export type { PluginBuildResult, PluginBuildConfig } from './build_plugin';
