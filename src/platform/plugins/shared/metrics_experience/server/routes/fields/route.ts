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
import { getMetricFields } from './get_metric_fields';
import { createRoute } from '../create_route';
import { throwNotFoundIfMetricsExperienceDisabled } from '../../lib/utils';

export const getFieldsRoute = createRoute({
  endpoint: 'GET /internal/metrics_experience/fields',
  security: { authz: { enabled: false, reason: 'Authorization provided by Elasticsearch' } },
  params: z.object({
    query: z.object({
      index: z.string().default('metrics-*'),
      to: z.string().datetime().default(dateMathParse('now')!.toISOString()).transform(isoToEpoch),
      from: z
        .string()
        .datetime()
        .default(dateMathParse('now-15m', { roundUp: true })!.toISOString())
        .transform(isoToEpoch),
      fields: z.union([z.string(), z.array(z.string())]).default('*'),
      page: z.coerce.number().int().positive().default(1),
      size: z.coerce.number().int().positive().default(100),
    }),
  }),
  handler: async ({ context, params, logger, response }) => {
    const { elasticsearch, featureFlags } = await context.core;
    await throwNotFoundIfMetricsExperienceDisabled(featureFlags);

    const esClient = elasticsearch.client.asCurrentUser;
    const page = params.query.page;
    const size = params.query.size;

    const { fields, total } = await getMetricFields({
      esClient: createTracedEsClient({
        logger,
        client: esClient,
        plugin: 'metrics_experience',
      }),
      indexPattern: params.query.index,
      timerange: { from: params.query.from, to: params.query.to },
      fields: params.query.fields,
      page,
      size,
      logger,
    });

    return {
      fields,
      total,
      page,
    };
  },
});

export const fieldsRoutes = {
  ...getFieldsRoute,
};
