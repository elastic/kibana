/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type supertest from 'supertest';
import { PassThrough } from 'stream';
import { createParser } from 'eventsource-parser';
import { Observable } from 'rxjs';

/**
 * Convert a supertest response to an SSE observable.
 *
 * Note: the supertest response should *NOT* be awaited when using that utility,
 * or at least not before calling it.
 *
 * @example
 * ```ts
 * const response = supertest
 *   .post(`/some/sse/endpoint`)
 *   .set('kbn-xsrf', 'kibana')
 *   .send({
 *     some: 'thing'
 *   });
 * const events = supertestIntoObservable(response);
 * ```
 */
export function supertestToObservable<T = any>(response: supertest.Test): Observable<T> {
  const stream = new PassThrough();
  response.pipe(stream);

  return new Observable<T>((subscriber) => {
    const parser = createParser((event) => {
      if (event.type === 'event') {
        subscriber.next(JSON.parse(event.data));
      }
    });

    const readStream = async () => {
      return new Promise<void>((resolve, reject) => {
        const decoder = new TextDecoder();

        const processChunk = (value: BufferSource) => {
          parser.feed(decoder.decode(value, { stream: true }));
        };

        stream.on('data', (chunk) => {
          processChunk(chunk);
        });

        stream.on('end', () => resolve());
        stream.on('error', (err) => reject(err));
      });
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
