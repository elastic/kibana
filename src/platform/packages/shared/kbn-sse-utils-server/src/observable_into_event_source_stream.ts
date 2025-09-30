/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { repeat } from 'lodash';
import type { Logger } from '@kbn/logging';
import type { ServerSentErrorEvent } from '@kbn/sse-utils/src/errors';
import { isSSEError, ServerSentEventErrorCode } from '@kbn/sse-utils/src/errors';
import type { ServerSentEvent } from '@kbn/sse-utils/src/events';
import { ServerSentEventType } from '@kbn/sse-utils/src/events';
import type { Observable } from 'rxjs';
import { catchError, map, of, Subject, throttleTime } from 'rxjs';
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

export const cloudProxyBufferSize = 4096;

export function observableIntoEventSourceStream(
  source$: Observable<ServerSentEvent>,
  {
    logger,
    signal,
    flushThrottleMs = 100,
    flushMinBytes,
  }: {
    logger: Pick<Logger, 'debug' | 'error'>;
    signal: AbortSignal;
    /**
     * The minimum time in milliseconds between flushes of the stream.
     * This is to avoid flushing too often if the source emits events in quick succession.
     *
     * @default 100
     */
    flushThrottleMs?: number;
    /**
     * The Cloud proxy currently buffers 4kb or 8kb of data until flushing.
     * This decreases the responsiveness of the streamed response,
     * so we manually insert some data during stream flushes to force the proxy to flush too.
     */
    flushMinBytes?: number;
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

  let currentBufferSize = 0;

  const stream = new ResponseStream();
  const flush$ = new Subject<void>();
  flush$
    // Using `leading: true` and `trailing: true` to avoid holding the flushing for too long,
    // but still avoid flushing too often (it will emit at the beginning of the throttling process, and at the end).
    .pipe(throttleTime(flushThrottleMs, void 0, { leading: true, trailing: true }))
    .subscribe(() => {
      if (currentBufferSize > 0 && flushMinBytes && currentBufferSize <= flushMinBytes) {
        const forceFlushContent = repeat('0', flushMinBytes * 2);
        stream.write(`: ${forceFlushContent}\n`);
      }
      stream.flush();
      currentBufferSize = 0;
    });

  const keepAliveIntervalId = setInterval(() => {
    // `:` denotes a comment - this is to keep the connection open
    // it will be ignored by the SSE parser on the client
    stream.write(': keep-alive\n');
    flush$.next();
  }, 10000);

  const subscription = withSerializedErrors$.subscribe({
    next: (line) => {
      stream.write(line);
      currentBufferSize += line.length;
      // Make sure to flush the written lines to emit them immediately (instead of waiting for buffer to fill)
      flush$.next();
    },
    complete: () => {
      flush$.complete();
      stream.end();
      clearTimeout(keepAliveIntervalId);
    },
    error: (error) => {
      clearTimeout(keepAliveIntervalId);
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
      flush$.complete();
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
