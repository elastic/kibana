/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createParser } from 'eventsource-parser';
import { Observable, throwError } from 'rxjs';
import { createSSEInternalError, ServerSentEventError } from '@kbn/sse-utils';

export interface StreamedHttpResponse {
  response?: { body: ReadableStream<Uint8Array> | null | undefined };
}

export function createObservableFromHttpResponse<T = never>(
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
    const parser = createParser((event) => {
      if (event.type === 'event')
        try {
          const data = JSON.parse(event.data);
          if (event.event === 'error') {
            subscriber.error(new ServerSentEventError(data.code, data.message, data.meta));
          } else {
            subscriber.next(data);
          }
        } catch (error) {
          subscriber.error(createSSEInternalError(`Failed to parse JSON`));
        }
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
