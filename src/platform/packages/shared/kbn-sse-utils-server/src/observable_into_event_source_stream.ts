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
import type { Zlib } from 'zlib';

class ResponseStream extends PassThrough {
  private _compressor?: Zlib;
  setCompressor(compressor: Zlib) {
    this._compressor = compressor;
  }
  flush() {
    this._compressor?.flush();
  }
}

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
      return createLine({ event: type, data: rest });
    })
  );

  const stream = new ResponseStream();

  const intervalId = setInterval(() => {
    // `:` denotes a comment - this is to keep the connection open
    // it will be ignored by the SSE parser on the client
    stream.write(': keep-alive\n');
  }, 10000);

  const subscription = withSerializedErrors$.subscribe({
    next: (line) => {
      stream.write(line);
      // Make sure to flush the written lines to emit them immediately (instead of waiting for buffer to fill)
      stream.flush();
    },
    complete: () => {
      stream.end();
      clearTimeout(intervalId);
    },
    error: (error) => {
      clearTimeout(intervalId);
      stream.write(
        createLine({
          event: 'error',
          data: {
            error: {
              code: ServerSentEventErrorCode.internalError,
              message: error.message,
            },
          },
        })
      );
      // No need to flush because we're ending the stream anyway
      stream.end();
    },
  });

  signal.addEventListener('abort', () => {
    subscription.unsubscribe();
    stream.end();
  });

  return stream;
}

function createLine({ event, data }: { event: string; data: unknown }) {
  return [
    `event: ${event}`,
    `data: ${JSON.stringify(data)}`,
    // We could also include `id` and `retry` if we see fit in the future.
    // https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#fields
    `\n`,
  ].join(`\n`);
}
