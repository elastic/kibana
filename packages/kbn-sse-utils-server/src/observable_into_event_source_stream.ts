/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { map, Observable } from 'rxjs';
import { PassThrough } from 'stream';
import { ServerSentEvent } from '@kbn/sse-utils';

export function observableIntoEventSourceStream(source$: Observable<ServerSentEvent>): PassThrough {
  const withSerializedErrors$ = source$.pipe(
    map((event) => {
      return `event:${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
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
      stream.write(`event: "error"\ndata: ${JSON.stringify(error)}\n\n`);
      stream.end();
    },
  });

  return stream;
}
