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
import { map, takeUntil, count, share, buffer, debounceTime } from 'rxjs/operators';
import chokidar from 'chokidar';

export type FileChangeState =
  | { type: 'ready'; fileCount: number }
  | { type: 'change'; paths: string[] };

interface Options {
  paths: string[];
  ignore: Array<string | RegExp>;
  cwd: string;
}

export function observeFileChanges({ paths, ignore, cwd }: Options) {
  return new Rx.Observable<FileChangeState>((subscriber) => {
    const watcher = chokidar.watch(paths, {
      cwd,
      ignored: ignore,
    });

    subscriber.add(() => {
      watcher.close();
    });

    const error$ = Rx.fromEvent(watcher, 'error').pipe(
      map((error) => {
        throw error;
      })
    );

    const ready$ = Rx.fromEvent(watcher, 'add').pipe(
      takeUntil(Rx.fromEvent(watcher, 'ready')),
      count(),
      map(
        (fileCount): FileChangeState => ({
          type: 'ready',
          fileCount,
        })
      )
    );

    const change$ = Rx.fromEvent<[string, string]>(watcher, 'all').pipe(
      map(([, path]) => path),
      share()
    );

    return Rx.merge(
      error$,
      Rx.concat(
        ready$,
        change$.pipe(
          buffer(change$.pipe(debounceTime(50))),
          map(
            (changes): FileChangeState => ({
              type: 'change',
              paths: Array.from(new Set(changes)).sort((a, b) => a.localeCompare(b)),
            })
          )
        )
      )
    ).subscribe(subscriber);
  });
}
