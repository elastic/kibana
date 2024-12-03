/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createParser } from 'eventsource-parser';
import { Observable, throwError } from 'rxjs';
import { createSSEInternalError, ServerSentEvent, ServerSentEventError } from '@kbn/sse-utils';
import { ServerSentErrorEvent } from '@kbn/sse-utils/src/errors';

export interface StreamedHttpResponse {
  response?: { body: ReadableStream<Uint8Array> | null | undefined };
}

export function createObservableFromHttpResponse<T extends ServerSentEvent = never>(
  response: StreamedHttpResponse
): Observable<T> {
  const rawResponse = response.response;

  const body = rawResponse?.body;
  if (!body) {
    return throwError(() => {
      throw createSSEInternalError(`No readable stream found in response`);
    });
  }

  return new Observable<T>((subscriber) => {
    const parser = createParser({
      onEvent: (event) => {
        try {
          const data = JSON.parse(event.data);
          if (event.event === 'error') {
            const errorData = data as Omit<ServerSentErrorEvent, 'type'>;
            subscriber.error(
              new ServerSentEventError(
                errorData.error.code,
                errorData.error.message,
                errorData.error.meta
              )
            );
          } else {
            subscriber.next({ type: event.event || 'event', ...data } as T);
          }
        } catch (error) {
          subscriber.error(createSSEInternalError(`Failed to parse JSON`));
        }
      },
    });

    const readStream = async () => {
      const reader = body.getReader();
      const decoder = new TextDecoder();

      // Function to process each chunk
      const processChunk = ({
        done,
        value,
      }: ReadableStreamReadResult<Uint8Array>): Promise<void> => {
        if (done) {
          return Promise.resolve();
        }

        parser.feed(decoder.decode(value, { stream: true }));

        return reader.read().then(processChunk);
      };

      // Start reading the stream
      return reader.read().then(processChunk);
    };

    readStream()
      .then(() => {
        subscriber.complete();
      })
      .catch((error) => {
        subscriber.error(error);
      });
  });
}
