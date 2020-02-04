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
import { take, tap, debounceTime, map } from 'rxjs/operators';
import Watchpack from 'watchpack';

import { pipeClosure, Bundle } from './common';

export interface ChangesStarted {
  type: 'changes detected';
}

export interface Changes {
  type: 'changes';
  bundles: Bundle[];
}

const debounceTimeBuffer = <T>(time: number) =>
  pipeClosure((source$: Rx.Observable<T>) => {
    const buffer = new Set<T>();
    return source$.pipe(
      tap(item => buffer.add(item)),
      debounceTime(time),
      map(() => {
        const items = Array.from(buffer);
        buffer.clear();
        return items;
      })
    );
  });

export class Watcher {
  // Use watcher as an RxJS Resource so that it is automatically closed
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

  private readonly change$ = Rx.fromEvent<[string]>(this.watchpack, 'change');

  public getNextChange(bundles: Iterable<Bundle>) {
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

      // debounce and bufffer change events for 100 milliseconds to
      // create final change notification
      this.change$.pipe(
        map(event => event[0]),
        debounceTimeBuffer(100),
        map(
          (changes): Changes => {
            const changedBundles: Bundle[] = [];

            findChangedBundles: for (const bundle of bundles) {
              const referencedFiles = bundle.cache.getReferencedFiles();
              for (const change of changes) {
                if (referencedFiles?.includes(change)) {
                  changedBundles.push(bundle);
                  continue findChangedBundles;
                }
              }
            }

            return {
              type: 'changes',
              bundles: changedBundles,
            };
          }
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

        this.watchpack.watch(watchPaths, [], Date.now());
        return Rx.EMPTY;
      })
    );
  }

  close() {
    this.watchpack.close();
  }

  unsubscribe() {
    this.close();
  }
}
