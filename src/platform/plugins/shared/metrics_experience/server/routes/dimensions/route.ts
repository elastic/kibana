/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { createTracedEsClient } from '@kbn/traced-es-client';
import { isoToEpoch } from '@kbn/zod-helpers';
import { parse as dateMathParse } from '@kbn/datemath';
import { createRoute } from '../create_route';
import { getDimensions } from './get_dimentions';
import { throwNotFoundIfMetricsExperienceDisabled } from '../../lib/utils';

export const getDimensionsRoute = createRoute({
  endpoint: 'GET /internal/metrics_experience/dimensions',
  security: { authz: { enabled: false, reason: 'Authorization provided by Elasticsearch' } },
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
      to: z.string().datetime().default(dateMathParse('now')!.toISOString()).transform(isoToEpoch),
      from: z
        .string()
        .datetime()
        .default(dateMathParse('now-15m', { roundUp: true })!.toISOString())
        .transform(isoToEpoch),
    }),
  }),
  handler: async ({ context, params, logger }) => {
    const { elasticsearch, featureFlags } = await context.core;
    await throwNotFoundIfMetricsExperienceDisabled(featureFlags);

    const { dimensions, indices, from, to } = params.query;
    const esClient = elasticsearch.client.asCurrentUser;

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
