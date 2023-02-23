/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { streamFactory } from '@kbn/aiops-utils';

import { simpleStringStreamRequestBodySchema } from '../../common/api/simple_string_stream';
import { API_ENDPOINT } from '../../common/api';

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const defineSimpleStringStreamRoute = (router: IRouter, logger: Logger) => {
  router.post(
    {
      path: API_ENDPOINT.SIMPLE_STRING_STREAM,
      validate: {
        body: simpleStringStreamRequestBodySchema,
      },
    },
    async (context, request, response) => {
      const maxTimeoutMs = request.body.timeout ?? 250;

      let shouldStop = false;
      request.events.aborted$.subscribe(() => {
        shouldStop = true;
      });
      request.events.completed$.subscribe(() => {
        shouldStop = true;
      });

      const { end, push, responseWithHeaders } = streamFactory(
        request.headers,
        logger,
        request.body.compressResponse
      );

      const text =
        'Elasticsearch is a search engine based on the Lucene library. It provides a distributed, multitenant-capable full-text search engine with an HTTP web interface and schema-free JSON documents. Elasticsearch is developed in Java and is dual-licensed under the source-available Server Side Public License and the Elastic license, while other parts fall under the proprietary (source-available) Elastic License. Official clients are available in Java, .NET (C#), PHP, Python, Apache Groovy, Ruby and many other languages. According to the DB-Engines ranking, Elasticsearch is the most popular enterprise search engine.';

      const tokens = text.split(' ');

      async function pushStreamUpdate() {
        try {
          if (shouldStop) {
            end();
            return;
          }

          const token = tokens.shift();

          if (token !== undefined) {
            push(`${token} `);
            await timeout(Math.floor(Math.random() * maxTimeoutMs));

            if (!shouldStop) {
              pushStreamUpdate();
            }
          } else {
            end();
          }
        } catch (e) {
          logger.error(`There was an error: ${e.toString()}`);
        }
      }

      // do not call this using `await` so it will run asynchronously while we return the stream already.
      pushStreamUpdate();

      return response.ok(responseWithHeaders);
    }
  );
};
