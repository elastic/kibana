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
import { DEFAULT_THEME_TAGS } from '@kbn/core-ui-settings-common';
import { createSingleCompileConfig } from './config/create_single_compile_config';
import { isHmrEnabled } from './hmr/hmr_enabled';
import { HmrServer } from './hmr/hmr_server';
import type { ThemeTag } from './types';
import { BUNDLES_SUBDIR } from './paths';

export const IGNORED_WATCH_PATTERNS: RegExp[] = [
  /[\\/]node_modules[\\/]/,
  /[\\/]target[\\/]/,
  /\.tsbuildinfo$/,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\.stories\.[jt]sx?$/,
  /\.mock\.[jt]sx?$/,
  /[\\/]__(?:mocks|snapshots|fixtures|jest)__[\\/]/,
  /[\\/]jest(?:\.integration)?\.config\.[jt]s$/,
];

export interface BuildOptions {
  repoRoot: string;
  outputRoot?: string;
  dist?: boolean;
  watch?: boolean;
  cache?: boolean;
  examples?: boolean;
  testPlugins?: boolean;
  themeTags?: ThemeTag[];
  log?: ToolingLog;
  /** Enable profiling - writes stats.json and RsDoctor report */
  profile?: boolean;
  /** Skip RsDoctor, only generate stats.json (faster) */
  profileStatsOnly?: boolean;
  /** Comma-separated plugin IDs for focused stats.json with module-level detail (requires profile) */
  profileFocus?: string[];
  /** Enable Hot Module Replacement in watch mode (undefined = auto-detect) */
  hmr?: boolean;
  /** Dev server base path (e.g. "/abc") for HMR auto-reload on server restart */
  basePath?: string;
  /** Override the limits.yml path (default: packages/kbn-rspack-optimizer/limits.yml) */
  limitsPath?: string;
}

export interface BuildResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  duration?: number;
  entryCount?: number;
  totalSize?: number;
  /** Function to close the watcher (only set in watch mode) */
  close?: () => Promise<void>;
  /** Resolves when the watcher closes (watch mode only) */
  done?: Promise<void>;
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
    themeTags = [...DEFAULT_THEME_TAGS],
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
      hmrServer = new HmrServer(options.basePath);
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
      log,
      profile,
      profileStatsOnly,
      profileFocus: options.profileFocus,
      hmr,
      hmrPort,
      limitsPath: options.limitsPath,
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
        log?.debug(`Bundles ready at ${BUNDLES_SUBDIR}/`);
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
    let previousBuildHash: string | undefined;
    let resolveDone: () => void;
    const done = new Promise<void>((r) => {
      resolveDone = r;
    });

    const cleanupStaleHotUpdates = (newHash: string) => {
      const keepHash = previousBuildHash;
      previousBuildHash = newHash;
      if (!keepHash) return;
      Fs.readdir(compiler.outputPath, (err, files) => {
        if (err) return;
        for (const file of files) {
          if (/\.hot-update\.(js|json)(\.map)?$/.test(file) && !file.includes(keepHash)) {
            Fs.unlink(Path.join(compiler.outputPath, file), () => {});
          }
        }
      });
    };

    const closeWatcher = (): Promise<void> => {
      if (isShuttingDown) {
        return Promise.resolve();
      }
      isShuttingDown = true;

      log?.info('Stopping RSPack watch mode...');

      hmrServer?.close();

      watching.close(() => {
        log?.info('RSPack watch mode stopped.');
        resolveDone();
      });

      return Promise.resolve();
    };

    log?.info('Setting up RSPack watcher...');
    log?.debug(`Watcher will ignore: ${IGNORED_WATCH_PATTERNS.map((re) => re.source).join(', ')}`);
    log?.debug('Aggregate timeout: 50ms');

    if (hmrServer) {
      compiler.hooks.compile.tap('kbn-hmr-building', () => {
        if (!isFirstBuild) {
          hmrServer.broadcastBuilding();
        }
      });
    }

    const watching = compiler.watch(
      {
        aggregateTimeout: 50,
        // rspack's WatchOptions.ignored only types as string[] | string | RegExp
        // | (path) => boolean (not RegExp[]), so use the predicate form.
        ignored: (filePath: string) => IGNORED_WATCH_PATTERNS.some((re) => re.test(filePath)),
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
              done,
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
              done,
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
            log?.debug(`Bundles ready at ${BUNDLES_SUBDIR}/`);
            if (stats.hash && hmrServer) {
              hmrServer.broadcast(stats.hash);
              cleanupStaleHotUpdates(stats.hash);
            }
          } else if (hmrServer && result.errors?.length) {
            hmrServer.broadcastErrors(result.errors);
          }

          resolve({
            ...result,
            close: closeWatcher,
            done,
          });
          return;
        }

        // Subsequent rebuilds
        isFirstBuild = false;
        const hasErrors = stats.hasErrors();

        if (hasErrors) {
          const timings = stats.toJson({
            timings: true,
            assets: false,
            errors: false,
            warnings: false,
            modules: false,
            chunks: false,
          });
          const rebuildTime = timings.time ? (timings.time / 1000).toFixed(1) : '?';
          const result = processStats(stats, log, { quiet: true });
          if (hmrServer && result.errors?.length) {
            hmrServer.broadcastErrors(result.errors);
          }
          log?.error(`Rebuild failed in ${rebuildTime}s — waiting for changes to fix errors...`);
        } else {
          const timings = stats.toJson({
            timings: true,
            assets: false,
            errors: false,
            warnings: false,
            modules: false,
            chunks: false,
          });
          const rebuildTime = timings.time ? (timings.time / 1000).toFixed(1) : '?';

          log?.debug(`Bundles ready at ${BUNDLES_SUBDIR}/`);
          if (stats.hash && hmrServer) {
            const changedFiles = compiler.modifiedFiles
              ? [...compiler.modifiedFiles]
                  .filter((f) => /\.\w+$/.test(f))
                  .map((f) => f.replace(repoRoot + '/', ''))
              : [];
            hmrServer.broadcast(stats.hash, rebuildTime, changedFiles);
          }

          if (stats.hash) {
            cleanupStaleHotUpdates(stats.hash);
          }

          const isVerbose =
            typeof log?.getWriters === 'function' &&
            log
              .getWriters()
              .some(
                (w) =>
                  'level' in w &&
                  (w as { level?: { flags?: { debug?: boolean } } }).level?.flags?.debug
              );

          if (isVerbose) {
            const result = processStats(stats, log, { quiet: true });
            let changedCount = 0;
            let changedSize = 0;
            for (const asset of result.assets ?? []) {
              const prev = previousAssetSizes.get(asset.name);
              if (prev === undefined || prev !== asset.size) {
                changedCount++;
                changedSize += asset.size;
              }
            }
            previousAssetSizes.clear();
            for (const asset of result.assets ?? []) {
              previousAssetSizes.set(asset.name, asset.size);
            }
            log?.debug(
              `Rebuilt in ${rebuildTime}s (${changedCount} chunks updated, ${formatSize(
                changedSize
              )} changed)`
            );
          } else {
            log?.success(`Rebuilt in ${rebuildTime}s`);
          }
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
      colors: true,
      errors: true,
      errorDetails: true,
      warnings: false,
      assets: false,
      modules: false,
      chunks: false,
    });

    const filteredOutput = output
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('Entrypoint '))
      .join('\n');

    if (filteredOutput) {
      log?.error(filteredOutput);
    }

    const errorInfo = stats.toJson({
      errors: true,
      warnings: false,
      assets: false,
      modules: false,
      chunks: false,
    });
    const errorMessages = errorInfo.errors?.map((e) => e.message) ?? [];

    return {
      success: false,
      errors: errorMessages.length > 0 ? errorMessages : ['Build failed with errors'],
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
    const lines = warningOutput
      .split('\n')
      .filter(
        (line) => !line.includes('rspack.persistentCache') && !line.includes('BuildDependencies')
      )
      .slice(0, 20);
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
    const entryLabel = entryCount === 1 ? 'entry' : 'entries';
    log?.debug(`${entryCount} ${entryLabel}, ${formatSize(totalSize)}`);
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

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
