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
import { getMetricFields } from './get_metric_fields';
import { createRoute } from '../create_route';
import { isMetricsExperienceEnabled } from '../../lib/utils';

export const getFieldsRoute = createRoute({
  endpoint: 'GET /internal/metrics_experience/fields',
  security: { authz: { requiredPrivileges: ['read'] } },
  params: z.object({
    query: z.object({
      index: z.string().default('metrics-*'),
      to: z.string().default('now'),
      from: z.string().default('now-15m'),
      fields: z.union([z.string(), z.array(z.string())]).default('*'),
      page: z.coerce.number().int().positive().default(1),
      size: z.coerce.number().int().positive().default(100),
    }),
  }),
  handler: async ({ context, params, logger, response }) => {
    const services = await context.resolve(['core']);
    const isEnabled = await isMetricsExperienceEnabled(services);

    if (!isEnabled) {
      return response.notFound();
    }

    const esClient = services.core.elasticsearch.client.asCurrentUser;
    const page = params.query.page;
    const size = params.query.size;

    const { fields, total } = await getMetricFields({
      esClient: createTracedEsClient({
        logger,
        client: esClient,
        plugin: 'metrics_experience',
      }),
      indexPattern: params.query.index,
      from: params.query.from,
      to: params.query.to,
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
