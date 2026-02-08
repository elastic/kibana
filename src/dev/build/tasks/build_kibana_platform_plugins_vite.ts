/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { lastValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';
import { runOptimizer, type OptimizerEvent } from '@kbn/vite-optimizer';

import type { Task } from '../lib';

export const BuildKibanaPlatformPluginsVite: Task = {
  description: 'Building distributable versions of Kibana platform plugins with Vite',
  async run(buildConfig, log, build) {
    const startTime = Date.now();

    await lastValueFrom(
      runOptimizer({
        repoRoot: REPO_ROOT,
        outputRoot: build.resolvePath(),
        dist: true,
        examples: buildConfig.pluginSelector.examples,
        testPlugins: buildConfig.pluginSelector.testPlugins,
      }).pipe(
        tap((event: OptimizerEvent) => {
          switch (event.type) {
            case 'starting':
              log.info(event.message!);
              break;

            case 'plugin-starting':
              log.debug(`  → ${event.message}`);
              break;

            case 'plugin-complete':
              if (event.result?.success) {
                log.debug(`  ✓ ${event.message}`);
              } else {
                log.warning(`  ✗ ${event.message}`);
              }
              if (event.progress) {
                const pct = Math.round((event.progress.completed / event.progress.total) * 100);
                log.info(
                  `  [${event.progress.completed}/${event.progress.total}] ${pct}% complete`
                );
              }
              break;

            case 'complete':
              log.success(event.message!);
              break;

            case 'error':
              log.error(event.message!);
              if (event.results) {
                const failures = event.results.filter((r) => !r.success);
                for (const failure of failures) {
                  log.error(`  Failed: ${failure.bundleId}`);
                  for (const err of failure.errors ?? []) {
                    log.error(`    ${err}`);
                  }
                }
              }
              break;
          }
        })
      )
    );

    const totalDuration = Date.now() - startTime;
    log.info(`Vite plugin build completed in ${(totalDuration / 1000).toFixed(1)}s`);
  },
};
