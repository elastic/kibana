/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { SUBMIT_ORDER_ROUTE_PATH } from '../../common';
import { processOrder } from '../pipeline/process_order';

export function registerSubmitOrderRoute(router: IRouter) {
  router.post(
    {
      path: SUBMIT_ORDER_ROUTE_PATH,
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out of authorization because it is only intended for workshop use',
        },
      },
      validate: {
        body: schema.object({
          drink: schema.oneOf([
            schema.literal('espresso'),
            schema.literal('latte'),
            schema.literal('cappuccino'),
            schema.literal('cold_brew'),
          ]),
          size: schema.oneOf([
            schema.literal('small'),
            schema.literal('medium'),
            schema.literal('large'),
          ]),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const result = await processOrder(request.body);
        return response.ok({ body: result });
      } catch (e) {
        // A stage failed — surface it as a 500 so the UI (and your traces) show the failure.
        return response.customError({
          statusCode: 500,
          body: { message: e instanceof Error ? e.message : String(e) },
        });
      }
    }
  );
}
