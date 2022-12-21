/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';

import * as Rx from 'rxjs';

/**
 *  Produces an Observable from a ReadableSteam that:
 *   - completes on the first "end" event
 *   - fails on the first "error" event
 */
export function observeReadable(readable: Readable): Rx.Observable<never> {
  return Rx.race(
    Rx.fromEvent(readable, 'end').pipe(Rx.first(), Rx.ignoreElements()),
    Rx.fromEvent(readable, 'error').pipe(
      Rx.first(),
      Rx.map((err) => {
        throw err;
      })
    )
  );
}
