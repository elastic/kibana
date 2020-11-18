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
export const handleErrors = <A, B, C, D extends RouteMethod>(
  handler: RequestHandler<A, B, C, D>
): RequestHandler<A, B, C, D> => async (context, request, response) => {
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

      return response.badRequest({
        body,
      });
    }

    throw error;
  }
};
