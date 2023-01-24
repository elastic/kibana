/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { concatMap } from 'rxjs/operators';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { ToolingLog } from '@kbn/tooling-log';

import { OptimizerConfig } from './optimizer';
import { OptimizerUpdate$ } from './run_optimizer';
import { pipeClosure } from './common';

export function reportOptimizerTimings(log: ToolingLog, config: OptimizerConfig) {
  return pipeClosure((update$: OptimizerUpdate$) => {
    let sent = false;

    const cachedBundles = new Set<string>();
    const notCachedBundles = new Set<string>();

    return update$.pipe(
      concatMap(async (update) => {
        // if we've already sent timing data then move on
        if (sent) {
          return update;
        }

        if (update.event?.type === 'bundle cached') {
          cachedBundles.add(update.event.bundle.id);
        }
        if (update.event?.type === 'bundle not cached') {
          notCachedBundles.add(update.event.bundle.id);
        }

        // wait for the optimizer to complete, either with a success or failure
        if (update.state.phase !== 'issue' && update.state.phase !== 'success') {
          return update;
        }

        sent = true;
        const reporter = CiStatsReporter.fromEnv(log);
        const time = Date.now() - update.state.startTime;

        await reporter.timings({
          timings: [
            {
              group: 'scripts/build_kibana_platform_plugins',
              id: 'total',
              ms: time,
              meta: {
                optimizerBundleCount: config.filteredBundles.length,
                optimizerBundleCacheCount: cachedBundles.size,
                optimizerBundleCachePct: Math.floor(
                  (cachedBundles.size / config.filteredBundles.length) * 100
                ),
                optimizerWatch: config.watch,
                optimizerProduction: config.dist,
                optimizerProfileWebpack: config.profileWebpack,
                optimizerBundleThemeTagsCount: config.themeTags.length,
                optimizerCache: config.cache,
                optimizerMaxWorkerCount: config.maxWorkerCount,
              },
            },
          ],
        });

        return update;
      })
    );
  });
}
