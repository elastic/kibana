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
