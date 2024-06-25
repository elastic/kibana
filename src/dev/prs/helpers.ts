/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';
import * as Rx from 'rxjs';
import { takeUntil } from 'rxjs';

/**
 * Convert a Readable stream to an observable of lines
 */
export const getLine$ = (stream: Readable) => {
  return new Rx.Observable<string>((subscriber) => {
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
