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
import { createRspackConfig, type RspackConfigOptions } from './config/create_rspack_config';
import { collectBundleMetrics, formatMetricsTable } from './utils/metrics';
import { discoverPlugins } from './utils/plugin_discovery';
import type { ThemeTag } from './types';

export interface BuildOptions extends Omit<RspackConfigOptions, 'themeTags'> {
  /** ToolingLog instance for output */
  log?: ToolingLog;
  /** Theme tags to build */
  themeTags?: ThemeTag[];
}

export interface BuildResult {
  success: boolean;
  stats?: Stats;
  errors?: string[];
  warnings?: string[];
  duration?: number;
}

/**
 * Run RSPack build with the provided options
 */
export async function runRspackBuild(options: BuildOptions): Promise<BuildResult> {
  const { log, ...configOptions } = options;
  const startTime = Date.now();

  try {
    // Create config
    log?.info('Creating RSPack configuration...');
    const config = await createRspackConfig({
      ...configOptions,
      themeTags: options.themeTags ?? ['borealislight', 'borealisdark'],
    });

    // Log plugin count
    const plugins = discoverPlugins({
      repoRoot: configOptions.repoRoot,
      outputRoot: configOptions.outputRoot,
      examples: configOptions.examples,
      testPlugins: configOptions.testPlugins,
      focus: configOptions.focus,
      filter: configOptions.filter,
    });
    log?.info(`Building ${plugins.length} plugins...`);

    // Create compiler
    const compiler = rspack(config);

    // Run build
    if (options.watch) {
      return runWatchBuild(compiler, log);
    } else {
      return runSingleBuild(compiler, log, startTime, options);
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
  startTime: number,
  options: BuildOptions
): Promise<BuildResult> {
  return new Promise((resolve) => {
    log?.info('Running RSPack build...');

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

      // Log errors
      if (stats.hasErrors()) {
        for (const error of info.errors ?? []) {
          log?.error(error.message);
        }
      }

      // Log warnings
      if (stats.hasWarnings()) {
        for (const warning of info.warnings ?? []) {
          log?.warning(warning.message);
        }
      }

      // Log success summary
      if (!stats.hasErrors()) {
        log?.info(
          stats.toString({
            preset: 'minimal',
            colors: true,
            timings: true,
          })
        );

        // Collect and log metrics if dist build
        if (options.dist) {
          const plugins = discoverPlugins({
            repoRoot: options.repoRoot,
            outputRoot: options.outputRoot,
            examples: options.examples,
            testPlugins: options.testPlugins,
            focus: options.focus,
            filter: options.filter,
          });

          const metrics = collectBundleMetrics(stats, {
            plugins,
            limitsPath: options.limitsPath,
          });

          log?.info(formatMetricsTable(metrics));
        }
      }

      // Close compiler
      compiler.close(() => {
        resolve({
          success: !stats.hasErrors(),
          stats,
          errors: info.errors?.map((e) => e.message),
          warnings: info.warnings?.map((w) => w.message),
          duration,
        });
      });
    });
  });
}

async function runWatchBuild(
  compiler: Compiler,
  log: ToolingLog | undefined
): Promise<BuildResult> {
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

        if (stats.hasErrors()) {
          for (const error of info.errors ?? []) {
            log?.error(error.message);
          }
        } else {
          log?.success(
            `Build completed in ${info.time}ms` +
              (info.warnings?.length ? ` with ${info.warnings.length} warnings` : '')
          );
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
