/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandler, RouteMethod, RequestHandlerContext } from '@kbn/core/server';
import { ErrorIndexPatternNotFound } from '../../error';

interface ErrorResponseBody {
  message: string;
  attributes?: object;
}

interface ErrorWithData {
  data?: object;
}

/**
 * This higher order request handler makes sure that errors are returned with
 * body formatted in the following shape:
 *
 * ```json
 * {
 *   "message": "...",
 *   "attributes": {}
 * }
 * ```
 */
export const handleErrors =
  <P, Q, B, Context extends RequestHandlerContext, Method extends RouteMethod>(
    handler: RequestHandler<P, Q, B, Context, Method>
  ): RequestHandler<P, Q, B, Context, Method> =>
  async (context, request, response) => {
    try {
      return await handler(context, request, response);
    } catch (error) {
      if (error instanceof Error) {
        const body: ErrorResponseBody = {
          message: error.message,
        };

        if (typeof (error as ErrorWithData).data === 'object') {
          body.attributes = (error as ErrorWithData).data;
        }

        const is404 =
          (error as ErrorIndexPatternNotFound).is404 || (error as any)?.output?.statusCode === 404;

        if (is404) {
          return response.notFound({
            headers: {
              'content-type': 'application/json',
            },
            body,
          });
        }

        return response.badRequest({
          headers: {
            'content-type': 'application/json',
          },
          body,
        });
      }

      throw error;
    }
  };
