/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { apm } from '@kbn/utils';
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

            trans = apm.Agent.startTransaction('@kbn/optimizer', 'cli');

            const bundlesCount = state.onlineBundles.length + state.offlineBundles.length;
            apm.Agent.addLabels({
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
              apm.Agent.captureError(b.failure, {
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
