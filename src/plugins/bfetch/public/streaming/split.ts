/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

/**
 * Receives observable that emits strings, and returns a new observable
 * that also returns strings separated by delimiter.
 *
 * Input stream:
 *
 *     asdf.f -> df..aaa. -> dfsdf
 *
 * Output stream, assuming "." is used as delimiter:
 *
 *     asdf -> fdf -> aaa -> dfsdf
 *
 */
export const split = (delimiter: string = '\n') => (
  in$: Observable<string>
): Observable<string> => {
  const out$ = new Subject<string>();
  let startingText = '';

  in$.subscribe(
    (chunk) => {
      const messages = (startingText + chunk).split(delimiter);

      // We don't want to send the last message here, since it may or
      // may not be a partial message.
      messages.slice(0, -1).forEach(out$.next.bind(out$));
      startingText = messages.length ? messages[messages.length - 1] : '';
    },
    out$.error.bind(out$),
    () => {
      out$.next(startingText);
      out$.complete();
    }
  );

  return out$.pipe(filter<string>(Boolean));
};
