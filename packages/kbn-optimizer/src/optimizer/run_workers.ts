/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { mergeMap, toArray } from 'rxjs';

import { maybeMap } from '../common';

import { OptimizerConfig } from './optimizer_config';
import { BundleCacheEvent } from './bundle_cache';
import { ChangeEvent } from './watcher';
import { assignBundlesToWorkers } from './assign_bundles_to_workers';
import { observeWorker } from './observe_worker';

/**
 * Create a stream of all worker events, these include messages
 * from workers and events about the status of workers. To get
 * these events we assign the bundles to workers via
 * `assignBundlesToWorkers()` and then start a worler for each
 * assignment with `observeWorker()`.
 *
 * Subscribes to `changeEvent$` in order to determine when more
 * bundles should be assigned to workers.
 *
 * Completes when all workers have exitted. If we are running in
 * watch mode this observable will never exit.
 */
export function runWorkers(
  config: OptimizerConfig,
  optimizerCacheKey: unknown,
  bundleCache$: Rx.Observable<BundleCacheEvent>,
  changeEvent$: Rx.Observable<ChangeEvent>
) {
  return Rx.concat(
    // first batch of bundles are based on how up-to-date the cache is
    bundleCache$.pipe(
      maybeMap((event) => (event.type === 'bundle not cached' ? event.bundle : undefined)),
      toArray()
    ),
    // subsequent batches are defined by changeEvent$
    changeEvent$.pipe(maybeMap((c) => (c.type === 'changes' ? c.bundles : undefined)))
  ).pipe(
    mergeMap((bundles) =>
      Rx.from(assignBundlesToWorkers(bundles, config.maxWorkerCount)).pipe(
        mergeMap((assignment) =>
          observeWorker(config, config.getWorkerConfig(optimizerCacheKey), assignment.bundles)
        )
      )
    )
  );
}
