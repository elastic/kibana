/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Readable } from 'stream';

import * as Rx from 'rxjs';
import { scan, share, mergeMap, last, catchError } from 'rxjs/operators';

const SEP = /\r?\n/;

import { observeChunks } from './observe_chunks';

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
  return observeChunks(readable).pipe(chunksToLines());
}

export function chunksToLines(): Rx.OperatorFunction<Buffer, string> {
  return (chunk$) => {
    const scan$ = chunk$.pipe(
      scan<Buffer, { buffer: string; lines: string[] }>(
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
        { buffer: '', lines: [] }
      ),
      share()
    );

    return Rx.merge(
      // merge in the "lines" from each step
      scan$.pipe(mergeMap(({ lines }) => lines || [])),

      // inject the "unsplit" data at the end
      scan$.pipe(
        last(),
        mergeMap(({ buffer }) => (buffer ? [buffer] : [])),
        // if there were no lines, last() will error, so catch and complete
        catchError(() => Rx.EMPTY)
      )
    );
  };
}
