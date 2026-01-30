/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rspack, type MultiCompiler, type MultiStats } from '@rspack/core';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  createOptimizedMFConfigs,
  type OptimizedMFConfigOptions,
} from './config/create_optimized_mf_config';
import type { ThemeTag } from './types';

export interface OptimizedMFBuildOptions extends Omit<OptimizedMFConfigOptions, 'themeTags'> {
  /** ToolingLog instance for output */
  log?: ToolingLog;
  /** Theme tags to build */
  themeTags?: ThemeTag[];
}

export interface OptimizedMFBuildResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  duration?: number;
}

/**
 * Run RSPack build with optimized Module Federation
 *
 * This supports:
 * - Full builds (core + all plugins)
 * - Isolated builds (specific plugins only)
 * - External plugin builds
 *
 * All outputs are compatible with each other via MF shared runtime.
 */
export async function runOptimizedMFBuild(
  options: OptimizedMFBuildOptions
): Promise<OptimizedMFBuildResult> {
  const { log, ...configOptions } = options;
  const startTime = Date.now();

  try {
    const isIsolated = configOptions.plugins && configOptions.plugins.length > 0;

    if (isIsolated) {
      log?.info(`Creating isolated MF build for: ${configOptions.plugins!.join(', ')}`);
    } else {
      log?.info('Creating full MF build configuration...');
    }

    const configs = await createOptimizedMFConfigs({
      ...configOptions,
      themeTags: options.themeTags ?? ['borealislight', 'borealisdark'],
    });

    if (configs.length === 0) {
      log?.warning('No plugins found to build');
      return {
        success: true,
        duration: (Date.now() - startTime) / 1000,
      };
    }

    log?.info(`Building ${configs.length} bundle(s)...`);

    // Create multi-compiler
    const compiler = rspack(configs) as unknown as MultiCompiler;

    if (options.watch) {
      return runWatchBuild(compiler, log);
    } else {
      return runSingleBuild(compiler, log, startTime, configs.length);
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
  compiler: MultiCompiler,
  log: ToolingLog | undefined,
  startTime: number,
  bundleCount: number
): Promise<OptimizedMFBuildResult> {
  return new Promise((resolve) => {
    let lastProgress = 0;
    const progressInterval = setInterval(() => {
      // Simple progress logging during build
      if (lastProgress < 90) {
        lastProgress += 10;
      }
    }, 2000);

    compiler.run((err, stats) => {
      clearInterval(progressInterval);
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

      const multiStats = stats as MultiStats;
      const hasErrors = multiStats.hasErrors();
      const hasWarnings = multiStats.hasWarnings();

      const errors: string[] = [];
      const warnings: string[] = [];

      // Collect errors and warnings from all compilers
      const info = multiStats.toJson({
        errors: true,
        warnings: true,
        timings: true,
      });

      for (const child of info.children ?? []) {
        for (const error of child.errors ?? []) {
          errors.push(`[${child.name}] ${error.message}`);
          log?.error(`[${child.name}]`, error.message);
        }
        for (const warning of child.warnings ?? []) {
          warnings.push(`[${child.name}] ${warning.message}`);
          if (log) {
            log.warning(`[${child.name}]`, warning.message);
          }
        }
      }

      if (!hasErrors) {
        log?.success(`Built ${bundleCount} bundle(s) in ${duration.toFixed(2)}s`);
      }

      compiler.close(() => {
        resolve({
          success: !hasErrors,
          errors: errors.length > 0 ? errors : undefined,
          warnings: warnings.length > 0 ? warnings : undefined,
          duration,
        });
      });
    });
  });
}

async function runWatchBuild(
  compiler: MultiCompiler,
  log: ToolingLog | undefined
): Promise<OptimizedMFBuildResult> {
  return new Promise((resolve) => {
    log?.info('Starting watch mode...');

    let isFirstBuild = true;
    const startTime = Date.now();

    const watching = compiler.watch(
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

        const multiStats = stats as MultiStats;
        const hasErrors = multiStats.hasErrors();

        if (hasErrors) {
          const info = multiStats.toJson({ errors: true });
          for (const child of info.children ?? []) {
            for (const error of child.errors ?? []) {
              log?.error(`[${child.name}]`, error.message);
            }
          }
        } else {
          const buildTime = isFirstBuild
            ? ((Date.now() - startTime) / 1000).toFixed(2)
            : 'incremental';
          log?.success(`Build completed (${buildTime}s)`);
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
