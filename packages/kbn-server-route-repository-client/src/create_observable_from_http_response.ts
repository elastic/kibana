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

export interface StreamedHttpResponse {
  response?: { body: ReadableStream<Uint8Array> | null | undefined };
}

class NoReadableStreamError extends Error {
  constructor() {
    super(`No readable stream found in response`);
  }
}

export function isNoReadableStreamError(error: any): error is NoReadableStreamError {
  return error instanceof NoReadableStreamError;
}

export function createObservableFromHttpResponse(
  response: StreamedHttpResponse
): Observable<string> {
  const rawResponse = response.response;

  const body = rawResponse?.body;
  if (!body) {
    return throwError(() => {
      throw new NoReadableStreamError();
    });
  }

  return new Observable<string>((subscriber) => {
    const parser = createParser((event) => {
      if (event.type === 'event') {
        subscriber.next(event.data);
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
