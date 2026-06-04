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
import { BREW_BATCH_ROUTE_PATH, DRINK_TYPES, DRINK_SIZES, type OrderRequest } from '../../common';
import { processOrder } from '../pipeline/process_order';

const pickRandom = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/**
 * Fires `count` random orders concurrently. This is the "generate load" button: because the
 * orders overlap, the in-flight UpDownCounter visibly rises and falls above 1, and the
 * backend fills up with a spread of durations, drinks, and the occasional failure.
 */
export function registerBrewBatchRoute(router: IRouter) {
  router.post(
    {
      path: BREW_BATCH_ROUTE_PATH,
      options: { access: 'internal' },
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out of authorization because it is only intended for workshop use',
        },
      },
      validate: {
        body: schema.object({
          count: schema.number({ defaultValue: 25, min: 1, max: 200 }),
        }),
      },
    },
    async (context, request, response) => {
      const { count } = request.body;
      const orders: OrderRequest[] = Array.from({ length: count }, () => ({
        drink: pickRandom(DRINK_TYPES),
        size: pickRandom(DRINK_SIZES),
      }));

      const results = await Promise.allSettled(orders.map((order) => processOrder(order)));
      const served = results.filter((result) => result.status === 'fulfilled').length;

      return response.ok({
        body: { requested: count, served, failed: results.length - served },
      });
    }
  );
}
