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

import { Readable } from 'stream';

import * as Rx from 'rxjs';
import { scan, takeUntil, share, materialize, mergeMap, last, catchError } from 'rxjs/operators';

const SEP = /\r?\n/;

import { observeReadable } from './observe_readable';

/**
 *  Creates an Observable from a Readable Stream that:
 *   - splits data from `readable` into lines
 *   - completes when `readable` emits "end"
 *   - fails if `readable` emits "errors"
 *
 *  @param  {ReadableStream} readable
 *  @return {Rx.Observable}
 */
export function observeLines(readable: Readable): Rx.Observable<string> {
  const done$ = observeReadable(readable).pipe(share());

  const scan$: Rx.Observable<{ buffer: string; lines?: string[] }> = Rx.fromEvent(
    readable,
    'data'
  ).pipe(
    scan(
      ({ buffer }, chunk) => {
        buffer += chunk;

        const lines = [];
        while (true) {
          const match = buffer.match(SEP);

          if (!match || match.index === undefined) {
            break;
          }

          lines.push(buffer.slice(0, match.index));
          buffer = buffer.slice(match.index + match[0].length);
        }

        return { buffer, lines };
      },
      { buffer: '' }
    ),

    // stop if done completes or errors
    takeUntil(done$.pipe(materialize())),

    share()
  );

  return Rx.merge(
    // use done$ to provide completion/errors
    done$,

    // merge in the "lines" from each step
    scan$.pipe(mergeMap(({ lines }) => lines || [])),

    // inject the "unsplit" data at the end
    scan$.pipe(
      last(),
      mergeMap(({ buffer }) => (buffer ? [buffer] : [])),
      // if there were no lines, last() will error, so catch and complete
      catchError(() => Rx.empty())
    )
  );
}
