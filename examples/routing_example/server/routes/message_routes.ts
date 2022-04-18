/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { POST_MESSAGE_ROUTE_PATH, INTERNAL_GET_MESSAGE_BY_ID_ROUTE } from '../../common';

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
