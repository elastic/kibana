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
import { rspack, type Compiler, type Stats } from '@rspack/core';
import type { ToolingLog } from '@kbn/tooling-log';
import { createSingleCompileConfig } from './config/create_single_compile_config';
import type { ThemeTag } from './types';

export interface HybridBuildOptions {
  repoRoot: string;
  outputRoot?: string;
  dist?: boolean;
  watch?: boolean;
  cache?: boolean;
  examples?: boolean;
  testPlugins?: boolean;
  themeTags?: ThemeTag[];
  plugins?: string[];
  filter?: string[];
  log?: ToolingLog;
  /** Enable profiling - writes stats.json and RsDoctor report */
  profile?: boolean;
  /** Skip RsDoctor, only generate stats.json (faster) */
  profileStatsOnly?: boolean;
}

export interface HybridBuildResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  duration?: number;
  /** Function to close the watcher (only set in watch mode) */
  close?: () => Promise<void>;
  /** True if build was interrupted by SIGINT/SIGTERM */
  interrupted?: boolean;
}

/**
 * Run RSPack build using SINGLE COMPILATION for all plugins.
 *
 * This is faster and more reliable than batched multi-compilation:
 * - All plugins built in one RSPack run
 * - Shared dependencies parsed only once
 * - Better chunk optimization
 * - Compatible with external plugin builds
 */
export async function runHybridBuild(options: HybridBuildOptions): Promise<HybridBuildResult> {
  const {
    repoRoot,
    outputRoot = repoRoot,
    dist = false,
    watch = false,
    cache = true,
    examples = false,
    testPlugins = false,
    themeTags = ['borealislight', 'borealisdark'],
    plugins: targetPlugins,
    filter,
    log,
    profile = false,
    profileStatsOnly = false,
  } = options;

  const startTime = Date.now();

  try {
    log?.info('Creating single-compilation RSPack config...');

    const config = await createSingleCompileConfig({
      repoRoot,
      outputRoot,
      dist,
      watch,
      cache,
      examples,
      testPlugins,
      themeTags,
      plugins: targetPlugins,
      filter,
      log,
      profile,
      profileStatsOnly,
    });

    log?.info('Starting RSPack compilation...');

    const compiler = rspack(config) as Compiler;

    if (watch) {
      return runWatchBuild(compiler, log, startTime, repoRoot);
    } else {
      return runProductionBuild(compiler, log, startTime, repoRoot);
    }
  } catch (error: any) {
    log?.error(`Build failed: ${error.message}`);
    if (error.stack) {
      log?.error(error.stack);
    }
    return {
      success: false,
      errors: [error.message],
      duration: (Date.now() - startTime) / 1000,
    };
  }
}

async function runProductionBuild(
  compiler: Compiler,
  log: ToolingLog | undefined,
  startTime: number,
  repoRoot: string
): Promise<HybridBuildResult> {
  return new Promise((resolve) => {
    compiler.run((err, stats) => {
      const duration = (Date.now() - startTime) / 1000;

      if (err) {
        log?.error(`Compilation error: ${err.message}`);
        compiler.close(() => {
          resolve({
            success: false,
            errors: [err.message],
            duration,
          });
        });
        return;
      }

      if (!stats) {
        compiler.close(() => {
          resolve({
            success: false,
            errors: ['No stats returned from compilation'],
            duration,
          });
        });
        return;
      }

      const result = processStats(stats, log, duration);

      // Copy bundles to plugin directories if successful
      if (result.success) {
        copyBundlesToPluginDirs(repoRoot, log);
      }

      compiler.close(() => {
        resolve(result);
      });
    });
  });
}

async function runWatchBuild(
  compiler: Compiler,
  log: ToolingLog | undefined,
  startTime: number,
  repoRoot: string
): Promise<HybridBuildResult> {
  return new Promise((resolve) => {
    let isFirstBuild = true;
    let hasResolvedFirstBuild = false;
    let isShuttingDown = false;

    // Create close function that can be called externally
    const closeWatcher = (): Promise<void> => {
      if (isShuttingDown) {
        return Promise.resolve();
      }
      isShuttingDown = true;

      log?.info('Stopping RSPack watch mode...');

      // Start closing the watcher (don't wait - it waits for compilation to finish)
      watching.close(() => {
        log?.info('RSPack watch mode stopped.');
      });
      
      // Return immediately - don't wait for close to complete
      // The process will exit and clean up
      return Promise.resolve();
    };

    log?.info('Setting up RSPack watcher...');
    log?.info(`Watcher will ignore: /node_modules/`);
    log?.info(`Aggregate timeout: 300ms`);

    const watching = compiler.watch(
      {
        aggregateTimeout: 300,
        ignored: /node_modules/,
      },
      (err, stats) => {
        log?.info('RSPack watch callback triggered');

        // Ignore callbacks during shutdown
        if (isShuttingDown) {
          log?.info('Ignoring callback - shutdown in progress');
          return;
        }

        const duration = (Date.now() - startTime) / 1000;

        if (err) {
          log?.error(`Watch error: ${err.message}`);
          if (isFirstBuild && !hasResolvedFirstBuild) {
            hasResolvedFirstBuild = true;
            resolve({
              success: false,
              errors: [err.message],
              duration,
              close: closeWatcher,
            });
          }
          return;
        }

        if (!stats) {
          log?.error('No stats returned');
          if (isFirstBuild && !hasResolvedFirstBuild) {
            hasResolvedFirstBuild = true;
            resolve({
              success: false,
              errors: ['No stats returned from compilation'],
              duration,
              close: closeWatcher,
            });
          }
          return;
        }

        const result = processStats(stats, log, isFirstBuild ? duration : undefined);

        // For the first build, resolve the promise with the result
        // This tells the optimizer whether the initial build succeeded
        if (isFirstBuild && !hasResolvedFirstBuild) {
          hasResolvedFirstBuild = true;
          isFirstBuild = false;

          if (result.success) {
            copyBundlesToPluginDirs(repoRoot, log);
            log?.info('Watching for changes... (Ctrl+C to stop)');
          }

          resolve({
            ...result,
            close: closeWatcher,
          });
          return;
        }

        // For subsequent builds (rebuilds), just log the result
        isFirstBuild = false; // Ensure this is set
        if (result.success) {
          log?.success(`Rebuild completed at ${new Date().toISOString()}`);
          copyBundlesToPluginDirs(repoRoot, log);
        } else {
          log?.error('Rebuild failed - waiting for changes...');
        }
        log?.info('Waiting for more changes...');
      }
    );

    // Store watcher reference for external cleanup via close function
  });
}

function processStats(
  stats: Stats,
  log: ToolingLog | undefined,
  duration?: number
): HybridBuildResult {
  const hasErrors = stats.hasErrors();
  const hasWarnings = stats.hasWarnings();

  if (hasErrors) {
    const output = stats.toString({
      colors: false,
      errors: true,
      errorDetails: true,
      warnings: false,
      assets: false,
      modules: false,
      chunks: false,
    });

    log?.error('Build errors:');
    // eslint-disable-next-line no-console
    console.error(output);

    return {
      success: false,
      errors: ['Build failed with errors - see output above'],
      duration,
    };
  }

  if (hasWarnings && log) {
    const warningOutput = stats.toString({
      colors: false,
      errors: false,
      warnings: true,
      assets: false,
      modules: false,
    });
    // Only show first few warnings
    const lines = warningOutput.split('\n').slice(0, 20);
    if (lines.length > 0) {
      log.warning('Build warnings (first 20):');
      for (const line of lines) {
        log.warning(line);
      }
    }
  }

  // Log success stats
  const info = stats.toJson({
    assets: true,
    errors: false,
    warnings: false,
    modules: false,
    chunks: false,
  });

  const entryCount = Object.keys(info.entrypoints ?? {}).length;
  const totalSize = info.assets?.reduce((sum, a) => sum + a.size, 0) ?? 0;

  log?.success(`Built ${entryCount} entries, total size: ${formatSize(totalSize)}`);

  if (duration) {
    log?.info(`Build time: ${duration.toFixed(2)}s`);
  }

  return {
    success: true,
    duration,
  };
}

/**
 * Copy built bundles from central output to each plugin's target/public directory.
 * This is needed because Kibana serves bundles from each plugin's own directory.
 */
function copyBundlesToPluginDirs(repoRoot: string, log: ToolingLog | undefined) {
  const bundlesDir = Path.resolve(repoRoot, 'target/public/bundles');

  if (!Fs.existsSync(bundlesDir)) {
    log?.warning('Bundles directory not found, skipping copy');
    return;
  }

  // Each subdirectory in bundles/ corresponds to a plugin
  const pluginDirs = Fs.readdirSync(bundlesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  log?.info(`Distributing bundles to ${pluginDirs.length} plugin directories...`);

  // For now, we keep bundles in the central location
  // Kibana's bundle routes will need to be updated to serve from there
  // OR we update the output path in the config to write directly to plugin dirs

  log?.info('Bundles ready at target/public/bundles/');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
