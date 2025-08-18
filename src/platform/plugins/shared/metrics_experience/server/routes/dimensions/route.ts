/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { isValidDateMath } from '@kbn/zod-helpers';
import { createTracedEsClient } from '@kbn/traced-es-client';
import { createRoute } from '../create_route';
import { getDimensions } from './get_dimentions';

export const getDimensionsRoute = createRoute({
  endpoint: 'GET /internal/metrics_experience/dimensions',
  security: { authz: { requiredPrivileges: ['read'] } },
  params: z.object({
    query: z.object({
      dimensions: z
        .string()
        .transform((str) => {
          try {
            const parsed = JSON.parse(str);
            return parsed;
          } catch {
            throw new Error('Invalid JSON');
          }
        })
        .pipe(z.array(z.string()).min(1).max(10)),
      indices: z
        .union([z.string(), z.array(z.string())])
        .transform((val) => (Array.isArray(val) ? val : [val]))
        .default(['metrics-*']),
      to: z.string().superRefine(isValidDateMath).default('now'),
      from: z.string().superRefine(isValidDateMath).default('now-15m'),
    }),
  }),
  handler: async ({ context, params, logger }) => {
    const { dimensions, indices, from, to } = params.query;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    const values = await getDimensions({
      esClient: createTracedEsClient({
        logger,
        client: esClient,
        plugin: 'metrics_experience',
      }),
      dimensions,
      indices,
      from,
      to,
      logger,
    });

    return { values };
  },
});

export const dimensionsRoutes = {
  ...getDimensionsRoute,
};
