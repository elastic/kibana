/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lastValueFrom, of, toArray } from 'rxjs';
import { httpResponseIntoObservable } from './http_response_into_observable';
import type { StreamedHttpResponse } from './create_observable_from_http_response';
import { ServerSentEventErrorCode } from '@kbn/sse-utils/src/errors';

function toSse(...events: Array<{ type: string } & Record<string, unknown>>) {
  return events.map((event) => {
    const { type, ...rest } = event;
    return new TextEncoder().encode(`event: ${type}\ndata: ${JSON.stringify(rest)}\n\n`);
  });
}

describe('httpResponseIntoObservable', () => {
  it('parses SSE output', async () => {
    const events = [
      {
        type: 'chatCompletionChunk',
        content: 'Hello',
      },
      {
        type: 'chatCompletionChunk',
        content: 'Hello again',
      },
    ];

    const messages = await lastValueFrom(
      of<StreamedHttpResponse>({
        response: {
          // @ts-expect-error
          body: ReadableStream.from(toSse(...events)),
        },
      }).pipe(httpResponseIntoObservable(), toArray())
    );

    expect(messages).toEqual(events);
  });

  it('throws serialized errors', async () => {
    const events = [
      {
        type: 'error',
        error: {
          code: ServerSentEventErrorCode.internalError,
          message: 'Internal error',
        },
      },
    ];

    await expect(async () => {
      await lastValueFrom(
        of<StreamedHttpResponse>({
          response: {
            // @ts-expect-error
            body: ReadableStream.from(toSse(...events)),
          },
        }).pipe(httpResponseIntoObservable(), toArray())
      );
    }).rejects.toThrowError(`Internal error`);
  });
});
