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
import { takeUntil } from 'rxjs/operators';

/**
 * Convert a Readable stream to an observable of lines
 */
export const getLine$ = (stream: Readable) => {
  return new Rx.Observable<string>(subscriber => {
    let buffer = '';
    return Rx.fromEvent(stream, 'data')
      .pipe(takeUntil(Rx.fromEvent(stream, 'close')))
      .subscribe({
        next(chunk) {
          buffer += chunk;
          while (true) {
            const i = buffer.indexOf('\n');
            if (i === -1) {
              break;
            }

            subscriber.next(buffer.slice(0, i));
            buffer = buffer.slice(i + 1);
          }
        },
        error(error) {
          subscriber.error(error);
        },
        complete() {
          if (buffer.length) {
            subscriber.next(buffer);
            buffer = '';
          }

          subscriber.complete();
        },
      });
  });
};
