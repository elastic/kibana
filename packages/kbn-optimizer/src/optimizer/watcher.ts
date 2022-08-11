/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { take, map, share } from 'rxjs/operators';
import Watchpack from 'watchpack';

import { debounceTimeBuffer, Bundle } from '../common';

export interface ChangesStarted {
  type: 'changes detected';
}

export interface Changes {
  type: 'changes';
  bundles: Bundle[];
}

export type ChangeEvent = ChangesStarted | Changes;

export class Watcher {
  /**
   * Use watcher as an RxJS Resource, which is a special type of observable
   * that calls unsubscribe on the resource (the Watcher instance in this case)
   * when the observable is unsubscribed.
   */
  static using<T>(fn: (watcher: Watcher) => Rx.Observable<T>) {
    return Rx.using(
      () => new Watcher(),
      (resource) => fn(resource as Watcher)
    );
  }

  private readonly watchpack = new Watchpack({
    aggregateTimeout: 0,
  });

  private readonly change$ = Rx.fromEvent<[string]>(this.watchpack, 'change').pipe(share());

  public getNextChange$(bundles: Bundle[], startTime: number) {
    return Rx.merge(
      // emit ChangesStarted as soon as we have been triggered
      this.change$.pipe(
        take(1),
        map(
          (): ChangesStarted => ({
            type: 'changes detected',
          })
        )
      ),

      // debounce and bufffer change events for 1 second to create
      // final change notification
      this.change$.pipe(
        map((event) => event[0]),
        debounceTimeBuffer(1000),
        map(
          (changes): Changes => ({
            type: 'changes',
            bundles: bundles.filter((bundle) => {
              const referencedFiles = bundle.cache.getReferencedPaths();
              return changes.some((change) => referencedFiles?.includes(change));
            }),
          })
        ),
        take(1)
      ),

      // call watchpack.watch after listerners are setup
      Rx.defer(() => {
        const watchPaths = new Set<string>();

        for (const bundle of bundles) {
          for (const path of bundle.cache.getReferencedPaths() || []) {
            watchPaths.add(path);
          }
        }

        this.watchpack.watch(Array.from(watchPaths), [], startTime);
        return Rx.EMPTY;
      })
    );
  }

  /**
   * Called automatically by RxJS when Watcher instances
   * are used as resources
   */
  unsubscribe() {
    this.watchpack.close();
  }
}
