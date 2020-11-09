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
import { POST_MESSAGE_ROUTE_PATH, INTERNAL_GET_MESSAGE_BY_ID_ROUTE } from '../../common';

import { IRouter } from '../../../../src/core/server';

/**
 *
 * NOTE: DON'T USE IN MEMORY DATA STRUCTURES TO STORE DATA!
 *
 * That won't work in a system with multiple Kibanas, which is a setup we recommend for
 * load balancing. I'm only doing so here to simplify the routing example. In real life,
 * Elasticsearch should be used to persist data that can be shared across multiple Kibana
 * instances.
 */

const messages: { [key: string]: string } = {};

/**
 * @param router Pushes a message with an id onto an in memory map.
 */
export function registerPostMessageRoute(router: IRouter) {
  router.post(
    {
      path: `${POST_MESSAGE_ROUTE_PATH}/{id}`,
      validate: {
        params: schema.object({
          // This parameter name matches the one in POST_MESSAGE_ROUTE_PATH: `api/post_message/{id}`.
          // Params are often used for ids like this.
          id: schema.string(),
        }),
        body: schema.object({
          message: schema.string({ maxLength: 100 }),
        }),
      },
    },
    async (context, request, response) => {
      if (messages[request.params.id]) {
        return response.badRequest({
          body: `Message with id ${request.params.id} already exists`,
        });
      }

      // See note above. NEVER DO THIS IN REAL CODE! Data should only be persisted in Elasticsearch.
      messages[request.params.id] = request.body.message;

      return response.ok();
    }
  );
}

/**
 * @param router Returns the message with the given id from an in memory array.
 */
export function registerGetMessageByIdRoute(router: IRouter) {
  router.get(
    {
      path: `${INTERNAL_GET_MESSAGE_BY_ID_ROUTE}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      if (!messages[request.params.id]) {
        return response.notFound();
      }
      return response.ok({ body: { message: messages[request.params.id] } });
    }
  );
}
