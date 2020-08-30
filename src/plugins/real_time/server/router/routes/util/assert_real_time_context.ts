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

import { RequestHandler, RouteMethod, RequestHandlerContext } from 'src/core/server';
import { RealTimeRouteContext, RealTimeRequestHandler } from '../../types';

const isRealTimeRouteContext = (context: RequestHandlerContext): context is RealTimeRouteContext =>
  !!context.realTime;

export const assertRealTimeContext = <A, B, C, D extends RouteMethod>(
  handler: RealTimeRequestHandler<A, B, C, D>
): RequestHandler<A, B, C, D> => (context, request, response) => {
  return isRealTimeRouteContext(context)
    ? handler(context, request, response)
    : response.badRequest({ body: 'RealTimeRequestHandlerContext is not registered.' });
};
