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

import Boom from 'boom';
import { ObjectType, TypeOf } from '@kbn/config-schema';
import { KibanaRequest } from './request';
import { KibanaResponseFactory } from './response';
import { RequestHandler } from './router';
import { RequestHandlerContext } from '../../../server';

export const wrapErrors = <P extends ObjectType, Q extends ObjectType, B extends ObjectType>(
  handler: RequestHandler<P, Q, B>
): RequestHandler<P, Q, B> => {
  return async (
    context: RequestHandlerContext,
    request: KibanaRequest<TypeOf<P>, TypeOf<Q>, TypeOf<B>>,
    response: KibanaResponseFactory
  ) => {
    try {
      return await handler(context, request, response);
    } catch (e) {
      if (Boom.isBoom(e)) {
        return response.customError({
          body: e.output.payload,
          statusCode: e.output.statusCode,
          headers: e.output.headers,
        });
      }
      throw e;
    }
  };
};
