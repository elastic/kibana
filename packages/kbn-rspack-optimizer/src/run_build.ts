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
import { isHmrEnabled } from './hmr/hmr_enabled';
import { HmrServer } from './hmr/hmr_server';
import type { ThemeTag } from './types';

export interface BuildOptions {
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
  /** Enable Hot Module Replacement in watch mode (undefined = auto-detect) */
  hmr?: boolean;
}

export interface BuildResult {
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
 * Run RSPack build using a single unified compilation for all plugins.
 *
 * - All plugins built in one RSPack run
 * - Shared dependencies parsed only once
 * - Better chunk optimization
 * - Compatible with external plugin builds
 */
export async function runBuild(options: BuildOptions): Promise<BuildResult> {
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
    hmr: hmrFlag,
  } = options;

  const startTime = Date.now();

  let hmrServer: HmrServer | undefined;

  try {
    // Resolve HMR enablement
    const hmr = isHmrEnabled({
      watch,
      dist,
      profile,
      hmrFlag,
      kbnHmrEnv: process.env.KBN_HMR,
    });

    let hmrPort: number | undefined;
    if (hmr) {
      hmrServer = new HmrServer();
      hmrPort = await hmrServer.start();
    }

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
      hmr,
      hmrPort,
    });

    log?.info('Starting RSPack compilation...');

    const compiler = rspack(config) as Compiler;

    if (watch) {
      return runWatchBuild(compiler, log, startTime, repoRoot, hmrServer);
    } else {
      // HMR is not used outside watch mode; clean up if somehow started
      await hmrServer?.close();
      return runProductionBuild(compiler, log, startTime, repoRoot);
    }
  } catch (error: any) {
    await hmrServer?.close();
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
): Promise<BuildResult> {
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

      const result = processStats(stats, log, { duration });

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
  repoRoot: string,
  hmrServer?: HmrServer
): Promise<BuildResult> {
  return new Promise((resolve) => {
    let isFirstBuild = true;
    let hasResolvedFirstBuild = false;
    let isShuttingDown = false;
    const previousAssetSizes = new Map<string, number>();

    const closeWatcher = (): Promise<void> => {
      if (isShuttingDown) {
        return Promise.resolve();
      }
      isShuttingDown = true;

      log?.info('Stopping RSPack watch mode...');

      hmrServer?.close();

      watching.close(() => {
        log?.info('RSPack watch mode stopped.');
      });
      
      return Promise.resolve();
    };

    log?.info('Setting up RSPack watcher...');
    log?.debug('Watcher will ignore: /node_modules/');
    log?.debug('Aggregate timeout: 300ms');

    const watching = compiler.watch(
      {
        aggregateTimeout: 300,
        ignored: /node_modules/,
      },
      (err, stats) => {
        if (isShuttingDown) {
          log?.debug('Ignoring callback - shutdown in progress');
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

        if (isFirstBuild && !hasResolvedFirstBuild) {
          const result = processStats(stats, log, { duration });
          hasResolvedFirstBuild = true;
          isFirstBuild = false;

          if (result.success) {
            for (const asset of result.assets ?? []) {
              previousAssetSizes.set(asset.name, asset.size);
            }
            copyBundlesToPluginDirs(repoRoot, log);
            if (stats.hash && hmrServer) {
              hmrServer.broadcast(stats.hash);
            }
            log?.info('Watching for changes... (Ctrl+C to stop)');
          } else if (hmrServer && result.errors?.length) {
            hmrServer.broadcastErrors(result.errors);
          }

          resolve({
            ...result,
            close: closeWatcher,
          });
          return;
        }

        // Subsequent rebuilds: single concise line with changed chunk info
        isFirstBuild = false;
        const result = processStats(stats, log, { quiet: true });
        const rebuildTime = result.compilationTime?.toFixed(1) ?? '?';

        if (result.success) {
          let changedCount = 0;
          let changedSize = 0;
          for (const asset of result.assets ?? []) {
            const prev = previousAssetSizes.get(asset.name);
            if (prev === undefined || prev !== asset.size) {
              changedCount++;
              changedSize += asset.size;
            }
          }

          // Update baseline for next rebuild
          previousAssetSizes.clear();
          for (const asset of result.assets ?? []) {
            previousAssetSizes.set(asset.name, asset.size);
          }

          copyBundlesToPluginDirs(repoRoot, log, true);
          if (stats.hash && hmrServer) {
            hmrServer.broadcast(stats.hash);
          }
          log?.success(
            `Rebuilt in ${rebuildTime}s (${changedCount} chunks updated, ${formatSize(changedSize)} changed)`
          );
        } else {
          if (hmrServer && result.errors?.length) {
            hmrServer.broadcastErrors(result.errors);
          }
          log?.error(`Rebuild failed in ${rebuildTime}s - waiting for changes...`);
        }
      }
    );
  });
}

interface ProcessStatsResult extends BuildResult {
  entryCount?: number;
  totalSize?: number;
  compilationTime?: number;
  assets?: Array<{ name: string; size: number }>;
}

function processStats(
  stats: Stats,
  log: ToolingLog | undefined,
  options: { duration?: number; quiet?: boolean } = {}
): ProcessStatsResult {
  const { duration, quiet = false } = options;
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

    const errorInfo = stats.toJson({ errors: true, warnings: false, assets: false, modules: false, chunks: false });
    const errorMessages = errorInfo.errors?.map((e) => e.message) ?? [];

    return {
      success: false,
      errors: errorMessages.length > 0 ? errorMessages : ['Build failed with errors - see output above'],
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
    const lines = warningOutput.split('\n').slice(0, 20);
    if (lines.length > 0) {
      log.warning('Build warnings (first 20):');
      for (const line of lines) {
        log.warning(line);
      }
    }
  }

  const info = stats.toJson({
    assets: true,
    timings: true,
    errors: false,
    warnings: false,
    modules: false,
    chunks: false,
  });

  const entryCount = Object.keys(info.entrypoints ?? {}).length;
  const totalSize = info.assets?.reduce((sum, a) => sum + a.size, 0) ?? 0;
  const compilationTime = info.time ? info.time / 1000 : undefined;

  if (!quiet) {
    log?.success(`Built ${entryCount} entries, total size: ${formatSize(totalSize)}`);

    if (duration) {
      log?.info(`Build time: ${duration.toFixed(2)}s`);
    }
  }

  return {
    success: true,
    duration,
    entryCount,
    totalSize,
    compilationTime,
    assets: info.assets?.map((a) => ({ name: a.name, size: a.size })) ?? [],
  };
}

/**
 * Copy built bundles from central output to each plugin's target/public directory.
 * This is needed because Kibana serves bundles from each plugin's own directory.
 */
function copyBundlesToPluginDirs(repoRoot: string, log: ToolingLog | undefined, quiet = false) {
  const bundlesDir = Path.resolve(repoRoot, 'target/public/bundles');

  if (!Fs.existsSync(bundlesDir)) {
    log?.warning('Bundles directory not found, skipping copy');
    return;
  }

  const pluginDirs = Fs.readdirSync(bundlesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (quiet) {
    log?.debug(`Distributing bundles to ${pluginDirs.length} plugin directories...`);
    log?.debug('Bundles ready at target/public/bundles/');
  } else {
    log?.info(`Distributing bundles to ${pluginDirs.length} plugin directories...`);
    log?.info('Bundles ready at target/public/bundles/');
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
