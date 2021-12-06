/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';

import * as Rx from 'rxjs';

export function observeChunks(readable: Readable): Rx.Observable<Buffer> {
  return new Rx.Observable((subscriber) => {
    subscriber.add(
      Rx.fromEvent<Buffer>(readable, 'data').subscribe({
        next(chunk) {
          subscriber.next(chunk);
        },
      })
    );

    subscriber.add(
      Rx.fromEvent<Error>(readable, 'error').subscribe({
        next(error) {
          subscriber.error(error);
        },
      })
    );

    subscriber.add(
      Rx.fromEvent(readable, 'end').subscribe({
        next() {
          subscriber.complete();
        },
      })
    );
  });
}
