/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map, Observable } from 'rxjs';
import { PassThrough } from 'stream';

export function observableIntoEventSourceStream(source$: Observable<unknown>): PassThrough {
  const withSerializedErrors$ = source$.pipe(
    map((event) => {
      return `data: ${JSON.stringify(event)}\n\n`;
    })
  );

  const stream = new PassThrough();

  withSerializedErrors$.subscribe({
    next: (line) => {
      stream.write(line);
    },
    complete: () => {
      stream.end();
    },
    error: (error) => {
      stream.write(`data: ${JSON.stringify(error)}\n\n`);
      stream.end();
    },
  });

  return stream;
}
