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

import { summarizeEventStream, Update } from './common';

import {
  OptimizerConfig,
  OptimizerEvent,
  OptimizerState,
  getBundleCacheEvent$,
  getOptimizerCacheKey,
  watchBundlesForChanges$,
  runWorkers,
  OptimizerInitializedEvent,
  createOptimizerStateSummarizer,
  handleOptimizerCompletion,
} from './optimizer';

export type OptimizerUpdate = Update<OptimizerEvent, OptimizerState>;
export type OptimizerUpdate$ = Rx.Observable<OptimizerUpdate>;

export function runOptimizer(config: OptimizerConfig) {
  return Rx.defer(async () => {
    if (process.platform === 'darwin') {
      try {
        require.resolve('fsevents');
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          throw new Error(
            '`fsevents` module is not installed, most likely because you need to follow the instructions at https://github.com/nodejs/node-gyp/blob/master/macOS_Catalina.md and re-bootstrap Kibana'
          );
        }

        throw error;
      }
    }

    return {
      startTime: Date.now(),
      cacheKey: await getOptimizerCacheKey(config),
    };
  }).pipe(
    mergeMap(({ startTime, cacheKey }) => {
      const bundleCacheEvent$ = getBundleCacheEvent$(config, cacheKey).pipe(
        observeOn(Rx.asyncScheduler),
        share()
      );

      // initialization completes once all bundle caches have been resolved
      const init$ = Rx.concat(
        bundleCacheEvent$,
        Rx.of<OptimizerInitializedEvent>({
          type: 'optimizer initialized',
        })
      );

      // watch the offline bundles for changes, turning them online...
      const changeEvent$ = config.watch
        ? watchBundlesForChanges$(bundleCacheEvent$, startTime).pipe(share())
        : Rx.EMPTY;

      // run workers to build all the online bundles, including the bundles turned online by changeEvent$
      const workerEvent$ = runWorkers(config, cacheKey, bundleCacheEvent$, changeEvent$);

      // create the stream that summarized all the events into specific states
      return summarizeEventStream<OptimizerEvent, OptimizerState>(
        Rx.merge(init$, changeEvent$, workerEvent$),
        {
          phase: 'initializing',
          compilerStates: [],
          offlineBundles: [],
          onlineBundles: [],
          startTime,
          durSec: 0,
        },
        createOptimizerStateSummarizer(config)
      );
    }),
    handleOptimizerCompletion(config)
  );
}
