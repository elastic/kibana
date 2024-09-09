/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
