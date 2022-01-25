/* Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter } from '../../../core/server';

import { schema } from '@kbn/config-schema';
import { generateSignedJwt } from './generateJwt';
import { GET_CHAT_TOKEN_ROUTE_PATH, GetChatTokenResponseBody } from '../common';

export function registerGetChatTokenRoute(router: IRouter, config: { chatIdentitySecret: string }) {
  router.get(
    {
      path: GET_CHAT_TOKEN_ROUTE_PATH,
      validate: {
        query: schema.object({
          userId: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { query: { userId } } = request;
      const token = generateSignedJwt(userId, config.chatIdentitySecret);
      const body: GetChatTokenResponseBody = { token };
      return response.ok({ body });
    }
  );
}
