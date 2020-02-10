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

import * as Rx from 'rxjs';
import { mergeMap, share, observeOn } from 'rxjs/operators';

import {
  OptimizerConfig,
  OptimizerMsg,
  getBundleCacheEvent$,
  getOptimizerCacheKey,
  watchBundlesForChanges$,
  runWorkers,
  OptimizerInitializedEvent,
  summarizeOptimizerEvent$,
} from './optimizer';

export function runOptimizer(config: OptimizerConfig) {
  return Rx.defer(async () => ({
    startTime: Date.now(),
    cacheKey: await getOptimizerCacheKey(config),
  })).pipe(
    mergeMap(
      (init): Rx.Observable<OptimizerMsg> => {
        const bundleCacheEvent$ = getBundleCacheEvent$(config, init.cacheKey).pipe(
          observeOn(Rx.asyncScheduler),
          share()
        );

        // watch the offline bundles for changes, turning them online...
        const changeEvent$ = config.watch
          ? watchBundlesForChanges$(bundleCacheEvent$, init.startTime).pipe(share())
          : Rx.EMPTY;

        // run workers to build all the online bundles, including the bundles turned online by changeEvent$
        const workerEvent$ = runWorkers(config, init.cacheKey, bundleCacheEvent$, changeEvent$);

        // kick off the event summarizer with an intialized event
        const initEvent: OptimizerInitializedEvent = {
          type: 'optimizer initialized',
        };

        // all of the events occuring within the optimizer
        const event$ = Rx.merge(
          Rx.concat(bundleCacheEvent$, Rx.of(initEvent)),
          changeEvent$,
          workerEvent$
        );

        // summarize all events into public OptimizerMsg objects, which include states and
        // the event which lead to that state
        return summarizeOptimizerEvent$(config, init.startTime, event$);
      }
    )
  );
}
