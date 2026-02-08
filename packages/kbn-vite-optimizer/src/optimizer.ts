/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Os from 'os';
import Path from 'path';
import { type Observable, Subject } from 'rxjs';
import { discoverUiPlugins, type PluginInfo } from './discover_plugins';
import {
  buildPlugin,
  preloadBuildModules,
  type PluginBuildResult,
  type PreloadedModules,
} from './build_plugin';

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
   * Maximum number of parallel builds.
   * Defaults to the number of CPU cores.
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
 * Simple concurrency limiter. Allows up to `limit` async tasks to run
 * simultaneously; additional tasks wait until a slot is free.
 */
function createSemaphore(limit: number) {
  let running = 0;
  const queue: Array<() => void> = [];

  function acquire(): Promise<void> {
    if (running < limit) {
      running++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => queue.push(resolve));
  }

  function release(): void {
    running--;
    const next = queue.shift();
    if (next) {
      running++;
      next();
    }
  }

  return { acquire, release };
}

/**
 * Build all plugins with bounded concurrency.
 *
 * 1. Pre-imports vite and @kbn/vite-config ONCE (shared across all builds).
 * 2. Launches every plugin build immediately, gated by a semaphore that
 *    limits active Rolldown instances to `maxWorkers` (defaults to CPU count).
 * 3. Uses Promise.allSettled so a single failure does not block others.
 */
async function buildAllPlugins(
  plugins: PluginInfo[],
  config: OptimizerConfig,
  events$: Subject<OptimizerEvent>
): Promise<PluginBuildResult[]> {
  const { repoRoot, outputRoot, dist, themeTags = ['borealislight', 'borealisdark'] } = config;
  const maxWorkers = config.maxWorkers ?? Os.cpus().length;
  const semaphore = createSemaphore(maxWorkers);
  let completed = 0;

  // Pre-warm: import vite and @kbn/vite-config once for all builds
  const modules: PreloadedModules = await preloadBuildModules();

  const promises = plugins.map(async (plugin) => {
    // Wait for a slot
    await semaphore.acquire();

    events$.next({
      type: 'plugin-starting',
      bundleId: plugin.id,
      message: `Building ${plugin.id}...`,
    });

    try {
      // Calculate output directory
      let outputDir: string;
      if (outputRoot) {
        const relativePath = Path.relative(repoRoot, plugin.directory);
        outputDir = Path.resolve(outputRoot, relativePath, 'target/public');
      } else {
        outputDir = Path.resolve(plugin.directory, 'target/public');
      }

      const result = await buildPlugin(
        {
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
        },
        modules
      );

      completed++;

      events$.next({
        type: 'plugin-complete',
        bundleId: plugin.id,
        message: result.success
          ? `Built ${plugin.id} in ${result.duration}ms`
          : `Failed to build ${plugin.id}: ${result.errors?.join(', ')}`,
        progress: { completed, total: plugins.length },
        result,
      });

      return result;
    } finally {
      semaphore.release();
    }
  });

  const settled = await Promise.allSettled(promises);

  // Convert settled results to PluginBuildResult[]
  return settled.map((outcome, i) => {
    if (outcome.status === 'fulfilled') {
      return outcome.value;
    }
    // Should not normally happen (buildPlugin catches internally), but handle just in case
    return {
      success: false,
      bundleId: plugins[i].id,
      outputDir: '',
      duration: 0,
      errors: [outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)],
    };
  });
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

      const maxWorkers = config.maxWorkers ?? Os.cpus().length;

      events$.next({
        type: 'starting',
        message: `Building ${plugins.length} plugins with Vite (concurrency: ${maxWorkers})...`,
        progress: {
          completed: 0,
          total: plugins.length,
        },
      });

      // Build all plugins with bounded concurrency
      const results = await buildAllPlugins(plugins, config, events$);

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
export type { PluginBuildResult, PluginBuildConfig, PreloadedModules } from './build_plugin';
