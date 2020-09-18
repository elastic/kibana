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

// match newline characters followed either by a non-space character or another newline
const NEWLINE = /\r?\n/;

/**
 * Observe a readable stdio stream and emit the entire lines
 * of text produced, completing once the stdio stream emits "end"
 * and erroring if it emits "error".
 */
export function observeStdio$(stream: Readable) {
  return new Rx.Observable<string>((subscriber) => {
    let buffer = '';

    subscriber.add(
      Rx.fromEvent<Buffer>(stream, 'data').subscribe({
        next(chunk) {
          buffer += chunk.toString('utf8');

          while (true) {
            const match = NEWLINE.exec(buffer);
            if (!match) {
              break;
            }

            const multilineChunk = buffer.slice(0, match.index);
            buffer = buffer.slice(match.index + match[0].length);
            subscriber.next(multilineChunk);
          }
        },
      })
    );

    const flush = () => {
      while (buffer.length && !subscriber.closed) {
        const line = buffer;
        buffer = '';
        subscriber.next(line);
      }
    };

    subscriber.add(
      Rx.fromEvent<void>(stream, 'end').subscribe(() => {
        flush();
        subscriber.complete();
      })
    );

    subscriber.add(
      Rx.fromEvent<Error>(stream, 'error').subscribe((error) => {
        flush();
        subscriber.error(error);
      })
    );
  });
}
