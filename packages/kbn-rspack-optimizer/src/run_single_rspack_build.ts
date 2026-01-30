/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rspack, type Stats, type Compiler, type Watching } from '@rspack/core';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  createSingleRspackConfig,
  type SingleRspackConfigOptions,
} from './config/create_single_rspack_config';
import type { ThemeTag } from './types';

export interface SingleBuildOptions extends Omit<SingleRspackConfigOptions, 'themeTags'> {
  /** ToolingLog instance for output */
  log?: ToolingLog;
  /** Theme tags to build */
  themeTags?: ThemeTag[];
}

export interface SingleBuildResult {
  success: boolean;
  stats?: Stats;
  errors?: string[];
  warnings?: string[];
  duration?: number;
}

/**
 * Run RSPack build with SINGLE compilation for all plugins
 *
 * This is the fastest approach:
 * - All plugins built in ONE compilation
 * - Shared dependencies parsed and bundled ONCE
 * - Automatic code splitting and deduplication
 */
export async function runSingleRspackBuild(options: SingleBuildOptions): Promise<SingleBuildResult> {
  const { log, ...configOptions } = options;
  const startTime = Date.now();

  try {
    log?.info('Creating single RSPack configuration for all plugins...');
    
    const config = await createSingleRspackConfig({
      ...configOptions,
      themeTags: options.themeTags ?? ['borealislight', 'borealisdark'],
    });

    log?.info('Starting single compilation build...');

    const compiler = rspack(config);

    if (options.watch) {
      return runWatchBuild(compiler, log);
    } else {
      return runSingleBuild(compiler, log, startTime);
    }
  } catch (error: any) {
    log?.error('Build failed:', error.message);
    return {
      success: false,
      errors: [error.message],
      duration: (Date.now() - startTime) / 1000,
    };
  }
}

async function runSingleBuild(
  compiler: Compiler,
  log: ToolingLog | undefined,
  startTime: number
): Promise<SingleBuildResult> {
  return new Promise((resolve) => {
    compiler.run((err, stats) => {
      const duration = (Date.now() - startTime) / 1000;

      if (err) {
        log?.error('Compiler error:', err.message);
        resolve({
          success: false,
          errors: [err.message],
          duration,
        });
        return;
      }

      if (!stats) {
        log?.error('No stats returned from compiler');
        resolve({
          success: false,
          errors: ['No stats returned'],
          duration,
        });
        return;
      }

      const info = stats.toJson({
        errors: true,
        warnings: true,
        timings: true,
        assets: true,
        chunks: false,
        modules: false,
      });

      // Collect errors and warnings
      const errors: string[] = [];
      const warnings: string[] = [];

      for (const error of info.errors ?? []) {
        errors.push(error.message);
        log?.error(error.message);
      }
      for (const warning of info.warnings ?? []) {
        warnings.push(warning.message);
        log?.warning(warning.message);
      }

      if (errors.length === 0) {
        log?.success(`Build completed in ${duration.toFixed(2)}s`);
        
        // Log some stats
        const assetCount = info.assets?.length ?? 0;
        const totalSize = info.assets?.reduce((sum, a) => sum + a.size, 0) ?? 0;
        log?.info(`  Generated ${assetCount} assets (${(totalSize / 1024 / 1024).toFixed(2)} MB total)`);
      }

      compiler.close(() => {
        resolve({
          success: errors.length === 0,
          stats,
          errors: errors.length > 0 ? errors : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
          duration,
        });
      });
    });
  });
}

async function runWatchBuild(
  compiler: Compiler,
  log: ToolingLog | undefined
): Promise<SingleBuildResult> {
  return new Promise((resolve) => {
    log?.info('Starting watch mode...');

    let isFirstBuild = true;
    let watching: Watching;

    watching = compiler.watch(
      {
        aggregateTimeout: 300,
        ignored: /node_modules/,
      },
      (err, stats) => {
        if (err) {
          log?.error('Watch error:', err.message);
          return;
        }

        if (!stats) {
          log?.error('No stats returned');
          return;
        }

        const info = stats.toJson({
          errors: true,
          warnings: true,
          timings: true,
        });

        const hasErrors = (info.errors?.length ?? 0) > 0;

        if (hasErrors) {
          for (const error of info.errors ?? []) {
            log?.error(error.message);
          }
        } else {
          const buildTime = info.time ? `${(info.time / 1000).toFixed(2)}s` : 'N/A';
          log?.success(`Build completed in ${buildTime}`);
        }

        if (isFirstBuild) {
          isFirstBuild = false;
          log?.info('Watching for changes... (press Ctrl+C to stop)');
        }
      }
    );

    // Handle shutdown
    const shutdown = () => {
      log?.info('Stopping watch mode...');
      watching.close(() => {
        resolve({ success: true });
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  });
}
