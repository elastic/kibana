/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { RequestHandler, RouteMethod } from 'src/core/server';
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
export const handleErrors = <P, Q, B, Method extends RouteMethod>(
  handler: RequestHandler<P, Q, B, Method>
): RequestHandler<P, Q, B, Method> => async (context, request, response) => {
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
