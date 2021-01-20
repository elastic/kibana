/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as Rx from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';

import { Bundle, maybeMap } from '../common';

import { BundleCacheEvent } from './bundle_cache';
import { Watcher } from './watcher';

/**
 * Recursively call watcher.getNextChange$, passing it
 * just the bundles that haven't been changed yet until
 * all bundles have changed, then exit
 */
function recursiveGetNextChange$(
  watcher: Watcher,
  bundles: Bundle[],
  startTime: number
): ReturnType<Watcher['getNextChange$']> {
  return !bundles.length
    ? Rx.EMPTY
    : watcher.getNextChange$(bundles, startTime).pipe(
        mergeMap((event) => {
          if (event.type === 'changes detected') {
            return Rx.of(event);
          }

          return Rx.concat(
            Rx.of(event),

            recursiveGetNextChange$(
              watcher,
              bundles.filter((b) => !event.bundles.includes(b)),
              Date.now()
            )
          );
        })
      );
}

/**
 * Create an observable that emits change events for offline
 * bundles.
 *
 * Once changes are seen in a bundle that bundles
 * files will no longer be watched.
 *
 * Once changes have been seen in all bundles changeEvent$
 * will complete.
 *
 * If there are no bundles to watch or we config.watch === false
 * the observable completes without sending any notifications.
 */
export function watchBundlesForChanges$(
  bundleCacheEvent$: Rx.Observable<BundleCacheEvent>,
  initialStartTime: number
) {
  return bundleCacheEvent$.pipe(
    maybeMap((event) => (event.type === 'bundle cached' ? event.bundle : undefined)),
    toArray(),
    mergeMap((bundles) =>
      bundles.length
        ? Watcher.using((watcher) => recursiveGetNextChange$(watcher, bundles, initialStartTime))
        : Rx.EMPTY
    )
  );
}
