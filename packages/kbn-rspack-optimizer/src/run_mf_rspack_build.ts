/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rspack, type MultiStats, type MultiCompiler, type MultiWatching } from '@rspack/core';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  createMFRspackConfig,
  type MFRspackConfigOptions,
} from './config/create_mf_rspack_config';
import { discoverPlugins } from './utils/plugin_discovery';
import { finishUnifiedProgress } from './plugins/unified_progress_plugin';
import type { ThemeTag } from './types';

export interface MFBuildOptions extends Omit<MFRspackConfigOptions, 'themeTags'> {
  /** ToolingLog instance for output */
  log?: ToolingLog;
  /** Theme tags to build */
  themeTags?: ThemeTag[];
}

export interface MFBuildResult {
  success: boolean;
  stats?: MultiStats;
  errors?: string[];
  warnings?: string[];
  duration?: number;
}

/**
 * Run RSPack build with Module Federation
 *
 * This builds all plugins as independent bundles that share dependencies
 * at runtime through Module Federation.
 */
export async function runMFRspackBuild(options: MFBuildOptions): Promise<MFBuildResult> {
  const { log, ...configOptions } = options;
  const startTime = Date.now();

  try {
    // First discover plugins to log info
    log?.info('Discovering plugins...');
    const plugins = discoverPlugins({
      repoRoot: configOptions.repoRoot,
      outputRoot: configOptions.outputRoot,
      examples: configOptions.examples,
      testPlugins: configOptions.testPlugins,
      focus: configOptions.focus,
      filter: configOptions.filter,
    });

    log?.info(`Found ${plugins.length} plugins with browser bundles`);
    if (plugins.length > 0) {
      log?.debug(`First 5 plugins: ${plugins.slice(0, 5).map((p) => p.id).join(', ')}`);
    }

    // Create configs for all plugins
    log?.info('Creating Module Federation RSPack configurations...');
    const configs = await createMFRspackConfig({
      ...configOptions,
      themeTags: options.themeTags ?? ['borealislight', 'borealisdark'],
    });

    log?.info(`Building ${plugins.length} plugins + core with Module Federation...`);
    log?.info(`Total configs: ${configs.length}`);

    // Create multi-compiler - RSPack will build all configs in parallel
    const compiler = rspack(configs) as MultiCompiler;

    // Run build
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
  compiler: MultiCompiler,
  log: ToolingLog | undefined,
  startTime: number
): Promise<MFBuildResult> {
  return new Promise((resolve) => {
    log?.info('Running Module Federation build...');

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
      });

      // Collect all errors and warnings from all compilations
      const errors: string[] = [];
      const warnings: string[] = [];

      for (const child of info.children ?? []) {
        for (const error of child.errors ?? []) {
          errors.push(`[${child.name}] ${error.message}`);
          log?.error(`[${child.name}] ${error.message}`);
        }
        for (const warning of child.warnings ?? []) {
          warnings.push(`[${child.name}] ${warning.message}`);
          log?.warning(`[${child.name}] ${warning.message}`);
        }
      }

      // Finish the unified progress bar
      finishUnifiedProgress();

      // Log success summary
      if (errors.length === 0) {
        log?.success(`Module Federation build completed in ${duration.toFixed(2)}s`);

        // Log per-compilation timings
        for (const child of info.children ?? []) {
          const childTime = child.time ? `${(child.time / 1000).toFixed(2)}s` : 'N/A';
          log?.info(`  ${child.name}: ${childTime}`);
        }
      }

      // Close compiler
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
  compiler: MultiCompiler,
  log: ToolingLog | undefined
): Promise<MFBuildResult> {
  return new Promise((resolve) => {
    log?.info('Starting Module Federation watch mode...');

    let isFirstBuild = true;
    let watching: MultiWatching;

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

        // Check for errors
        let hasErrors = false;
        for (const child of info.children ?? []) {
          if ((child.errors?.length ?? 0) > 0) {
            hasErrors = true;
            for (const error of child.errors ?? []) {
              log?.error(`[${child.name}] ${error.message}`);
            }
          }
        }

        if (!hasErrors) {
          const totalTime = info.children?.reduce((sum, c) => sum + (c.time ?? 0), 0) ?? 0;
          log?.success(`Build completed in ${(totalTime / 1000).toFixed(2)}s`);
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
