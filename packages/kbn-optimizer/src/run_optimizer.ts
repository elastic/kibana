/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { mergeMap, share, observeOn } from 'rxjs';

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
