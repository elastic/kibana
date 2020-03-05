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
      resource => fn(resource as Watcher)
    );
  }

  private readonly watchpack = new Watchpack({
    aggregateTimeout: 0,
    ignored: /node_modules\/([^\/]+[\/])*(?!package.json)([^\/]+)$/,
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
        map(event => event[0]),
        debounceTimeBuffer(1000),
        map(
          (changes): Changes => ({
            type: 'changes',
            bundles: bundles.filter(bundle => {
              const referencedFiles = bundle.cache.getReferencedFiles();
              return changes.some(change => referencedFiles?.includes(change));
            }),
          })
        ),
        take(1)
      ),

      // call watchpack.watch after listerners are setup
      Rx.defer(() => {
        const watchPaths: string[] = [];

        for (const bundle of bundles) {
          for (const path of bundle.cache.getReferencedFiles() || []) {
            watchPaths.push(path);
          }
        }

        this.watchpack.watch(watchPaths, [], startTime);
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
