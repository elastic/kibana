/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Agent from 'elastic-apm-node';
import { tap } from 'rxjs/operators';

import { OptimizerConfig } from './optimizer';
import { OptimizerUpdate$ } from './run_optimizer';
import { pipeClosure } from './common';

export function apmOptimizerStats(config: OptimizerConfig) {
  return pipeClosure((update$: OptimizerUpdate$) => {
    let loggedInit = false;
    let trans: any;

    return update$.pipe(
      tap(async (update) => {
        const { state } = update;

        if (state.phase === 'initialized') {
          if (!loggedInit) {
            loggedInit = true;

            trans = Agent.startTransaction('@kbn/optimizer run', 'kibana_platform');
            const bundlesCount = state.onlineBundles.length + state.offlineBundles.length;
            Agent.addLabels({
              optimizer_bundle_count: bundlesCount,
              optimizer_bundle_cache_count: state.offlineBundles.length,
              optimizer_bundle_cache_pct: Math.round(
                (state.offlineBundles.length / bundlesCount) * 100
              ),
              optimizer_watch: config.watch,
              optimizer_production: config.dist,
              optimizer_profile_webpack: config.profileWebpack,
              optimizer_bundle_theme_tags_count: config.themeTags.length,
              optimizer_cache: config.cache,
              optimizer_max_worker_count: config.maxWorkerCount,
            });
          }

          return;
        }

        if (state.phase === 'issue') {
          for (const b of state.compilerStates) {
            if (b.type === 'compiler issue') {
              Agent.captureError(b.failure, {
                custom: {
                  optimizer_bundle_id: b.bundleId,
                },
              });
            }
          }
          return;
        }

        if (state.phase === 'success') {
          if (trans) {
            trans.end();
          }

          return;
        }
      })
    );
  });
}
