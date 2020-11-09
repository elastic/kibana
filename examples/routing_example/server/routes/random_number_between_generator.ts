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

import { schema } from '@kbn/config-schema';
import { RANDOM_NUMBER_BETWEEN_ROUTE_PATH } from '../../common';

import { IRouter } from '../../../../src/core/server';

/**
 *
 * @param router Registers a get route that returns a random number between one and another number suplied by the user.
 */
export function registerGetRandomNumberBetweenRoute(router: IRouter) {
  router.get(
    {
      path: RANDOM_NUMBER_BETWEEN_ROUTE_PATH,
      validate: {
        query: schema.object({
          max: schema.number({ defaultValue: 10 }),
        }),
      },
    },
    async (context, request, response) => {
      return response.ok({
        body: {
          randomNumber: Math.random() * request.query.max,
        },
      });
    }
  );
}
