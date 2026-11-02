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
import { parseLegacyKibanaPlatformPlugin } from '@kbn/repo-packages/legacy';
import { rspack, createExternalPluginConfig } from '@kbn/rspack-optimizer';
import type { Compiler, Stats, Watching } from '@kbn/rspack-optimizer';

import type { TaskContext } from '../task_context';

/**
 * Build the plugin's browser bundle with RSPack.
 *
 * This creates a bundle that:
 * - Externalizes shared deps to __kbnSharedDeps__ (React, EUI, etc.)
 * - Externalizes cross-plugin imports to __kbnBundles__.get()
 * - Registers itself with __kbnBundles__.define()
 *
 * The output can be loaded after kibana.bundle.js and integrates
 * with Kibana's plugin system.
 */
export async function optimize({
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

    const { manifestPath } = plugin;
    const rel = Path.relative(REPO_ROOT, outputDir);

    const createCompiler = async () => {
      const { manifest } = parseLegacyKibanaPlatformPlugin(manifestPath);
      const config = await createExternalPluginConfig({
        repoRoot: REPO_ROOT,
        pluginDir: sourceDir,
        pluginId: manifest.id,
        outputDir,
        manifest: {
          path: manifestPath,
          // Legacy `kibana.json` plugins have always exposed `common` as a bundle
          // target alongside `public`; keep that in addition to any declared dirs.
          extraPublicDirs: [...new Set(['common', ...manifest.extraPublicDirs])],
          requiredPlugins: manifest.requiredPlugins,
          requiredBundles: manifest.requiredBundles,
        },
        dist: !!dist,
        watch: !!watch,
        cache: !dist, // Disable cache for dist builds
      });
      return rspack(config);
    };

    const reportStats = (stats: Stats) => {
      if (stats.hasErrors()) {
        for (const error of stats.toJson().errors ?? []) {
          log.error(`RSPack error: ${error.message}`);
        }
        return;
      }

      if (stats.hasWarnings()) {
        log.warning(`browser bundle created at ${rel}, but with warnings:`);
        for (const warning of stats.toJson().warnings ?? []) {
          log.warning(warning.message);
        }
      } else {
        log.success(`browser bundle created at ${rel}`);
      }
    };

    if (watch) {
      // The allowed cross-plugin imports are baked into the config, and rspack's
      // incremental make does not re-factorize an import that failed in an
      // earlier compilation. Restart the compiler whenever the manifest changes
      // so edits to `requiredPlugins` / `requiredBundles` take effect.
      return new Promise<void>((resolve, reject) => {
        let watching: Watching | undefined;

        const startWatching = (compiler: Compiler) => {
          let manifestChanged = false;
          compiler.hooks.watchRun.tap('RestartOnManifestChange', ({ modifiedFiles }) => {
            manifestChanged = modifiedFiles?.has(manifestPath) ?? false;
          });

          const current = compiler.watch({}, async (err, stats) => {
            if (err) {
              log.error(`RSPack error: ${err.message}`);
              return;
            }

            if (manifestChanged) {
              manifestChanged = false;
              let next: Compiler;
              try {
                next = await createCompiler();
              } catch (manifestError) {
                log.error(
                  `plugin manifest changed but could not be loaded, keeping the previous build: ${manifestError.message}`
                );
                return;
              }
              log.info('plugin manifest changed, restarting @kbn/rspack-optimizer');
              current.close(() => startWatching(next));
              return;
            }

            if (stats) reportStats(stats);
          });
          watching = current;
        };

        createCompiler().then(startWatching, reject);

        // Handle process exit. `watching` is unset until the first compiler is
        // created, and briefly during a manifest-triggered restart.
        process.once('SIGINT', () => {
          const done = () => {
            log.info('stopping @kbn/rspack-optimizer');
            resolve();
          };
          if (watching) watching.close(done);
          else done();
        });

        process.once('exit', () => {
          if (watching) watching.close(resolve);
          else resolve();
        });
      });
    } else {
      // Single build
      const compiler = await createCompiler();
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

          if (stats) reportStats(stats);

          resolve();
        });
      });
    }
  });
}
