/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger } from '@kbn/logging';
import {
  isSSEError,
  ServerSentErrorEvent,
  ServerSentEventErrorCode,
} from '@kbn/sse-utils/src/errors';
import { ServerSentEvent, ServerSentEventType } from '@kbn/sse-utils/src/events';
import { catchError, map, Observable, of } from 'rxjs';
import { PassThrough } from 'stream';

export function observableIntoEventSourceStream(
  source$: Observable<ServerSentEvent>,
  {
    logger,
    signal,
  }: {
    logger: Pick<Logger, 'debug' | 'error'>;
    signal: AbortSignal;
  }
) {
  const withSerializedErrors$ = source$.pipe(
    catchError((error): Observable<ServerSentErrorEvent> => {
      if (isSSEError(error)) {
        logger.error(error);
        logger.debug(() => JSON.stringify(error));
        return of({
          type: ServerSentEventType.error,
          error: {
            code: error.code,
            message: error.message,
            meta: error.meta,
          },
        });
      }

      logger.error(error);

      return of({
        type: ServerSentEventType.error,
        error: {
          code: ServerSentEventErrorCode.internalError,
          message: error.message as string,
        },
      });
    }),
    map((event) => {
      const { type, ...rest } = event;
      return `event: ${type}\ndata: ${JSON.stringify(rest)}\n\n`;
    })
  );

  const stream = new PassThrough();

  const intervalId = setInterval(() => {
    // `:` denotes a comment - this is to keep the connection open
    // it will be ignored by the SSE parser on the client
    stream.write(': keep-alive');
  }, 10000);

  const subscription = withSerializedErrors$.subscribe({
    next: (line) => {
      stream.write(line);
    },
    complete: () => {
      stream.end();
      clearTimeout(intervalId);
    },
    error: (error) => {
      clearTimeout(intervalId);
      stream.write(
        `event:error\ndata: ${JSON.stringify({
          error: {
            code: ServerSentEventErrorCode.internalError,
            message: error.message,
          },
        })}\n\n`
      );
      stream.end();
    },
  });

  signal.addEventListener('abort', () => {
    subscription.unsubscribe();
    stream.end();
  });

  return stream;
}
