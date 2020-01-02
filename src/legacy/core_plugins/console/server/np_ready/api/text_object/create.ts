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

import { schema, TypeOf } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { RouteDependencies } from '.';
import { anonymousUserId as userId } from './common';

import { TEXT_OBJECT_API_PATH } from '../../../../common/constants';
import { type } from '../../../../common/text_object';

const bodySchema = schema.object({
  userId,
  attributes: schema.object({}, { allowUnknowns: true }),
});

export type BodySchema = TypeOf<typeof bodySchema>;

export const registerCreate = (router: IRouter, { savedObjectsService }: RouteDependencies) => {
  router.put(
    {
      path: `${TEXT_OBJECT_API_PATH}/create`,
      validate: {
        body: bodySchema,
      },
    },
    async (ctx, request, response) => {
      const { userId: userIdValue, attributes } = request.body;
      const attributesCopy: Record<string, any> = { ...attributes };
      if (userIdValue) {
        attributesCopy.userId = userIdValue;
      }
      const client = savedObjectsService.getScopedClient(request);
      const result = await client.create(type, attributes);
      return response.ok({ body: result });
    }
  );
};
