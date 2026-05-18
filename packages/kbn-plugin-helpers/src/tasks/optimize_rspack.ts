/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { rspack } from '@rspack/core';
import { createExternalPluginConfig } from '@kbn/rspack-optimizer';

import type { TaskContext } from '../task_context';

/**
 * Build plugin using RSPack instead of webpack.
 *
 * This creates a bundle that:
 * - Externalizes shared deps to __kbnSharedDeps__ (React, EUI, etc.)
 * - Externalizes cross-plugin imports to __kbnBundles__.get()
 * - Registers itself with __kbnBundles__.define()
 *
 * The output can be loaded after kibana.bundle.js and integrates
 * with Kibana's plugin system.
 */
export async function optimizeRspack({
  log,
  dev,
  dist,
  watch,
  plugin,
  sourceDir,
  buildDir,
}: TaskContext) {
  if (!plugin.manifest.ui) {
    return;
  }

  log.info(`running @kbn/rspack-optimizer${!!watch ? ' in watch mode (use CTRL+C to quit)' : ''}`);

  await log.indent(2, async () => {
    const outputDir = Path.resolve(dev ? sourceDir : buildDir, 'target/public');

    const config = await createExternalPluginConfig({
      repoRoot: REPO_ROOT,
      pluginDir: sourceDir,
      pluginId: plugin.manifest.id,
      outputDir,
      dist: !!dist,
      watch: !!watch,
      cache: !dist, // Disable cache for dist builds
    });

    const compiler = rspack(config);
    const rel = Path.relative(REPO_ROOT, outputDir);

    if (watch) {
      // Watch mode
      return new Promise<void>((resolve, reject) => {
        const watching = compiler.watch({}, (err, stats) => {
          if (err) {
            log.error(`RSPack error: ${err.message}`);
            return;
          }

          if (stats?.hasErrors()) {
            const info = stats.toJson();
            info.errors?.forEach((error) => {
              log.error(`RSPack error: ${error.message}`);
            });
            return;
          }

          if (stats?.hasWarnings()) {
            const info = stats.toJson();
            log.warning(`browser bundle created at ${rel}, but with warnings:`);
            info.warnings?.forEach((warning) => {
              log.warning(warning.message);
            });
          } else {
            log.success(`browser bundle created at ${rel}`);
          }
        });

        // Handle process exit
        process.once('SIGINT', () => {
          watching.close(() => {
            log.info('stopping @kbn/rspack-optimizer');
            resolve();
          });
        });

        process.once('exit', () => {
          watching.close(() => {
            resolve();
          });
        });
      });
    } else {
      // Single build
      return new Promise<void>((resolve, reject) => {
        compiler.run((err, stats) => {
          // Close compiler
          compiler.close((closeErr) => {
            if (closeErr) {
              log.error(`RSPack close error: ${closeErr.message}`);
            }
          });

          if (err) {
            log.error(`RSPack error: ${err.message}`);
            reject(err);
            return;
          }

          if (stats?.hasErrors()) {
            const info = stats.toJson();
            const errorMessages = info.errors?.map((e) => e.message).join('\n') || 'Unknown error';
            log.error(`RSPack build failed:\n${errorMessages}`);
            reject(new Error('RSPack build failed'));
            return;
          }

          if (stats?.hasWarnings()) {
            const info = stats.toJson();
            log.warning(`browser bundle created at ${rel}, but with warnings:`);
            info.warnings?.forEach((warning) => {
              log.warning(warning.message);
            });
          } else {
            log.success(`browser bundle created at ${rel}`);
          }

          resolve();
        });
      });
    }
  });
}
