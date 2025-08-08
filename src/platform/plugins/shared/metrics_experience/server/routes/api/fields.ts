/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { fetchMetricFields } from '../../lib/fetch_metric_fields';
import { createRoute } from '../create_route';

export const fieldsApi = createRoute({
  endpoint: 'GET /internal/metrics_experience/fields',
  security: { authz: { requiredPrivileges: ['read'] } },
  params: z.object({
    query: z.object({
      index: z.string().default('metrics-*'),
      to: z.string().default('now'),
      from: z.string().default('now-15m'),
      fields: z.string().default('*'),
      page: z.string().default('1'),
      size: z.string().default('100'),
    }),
  }),
  handler: async ({ context, params, logger, response }) => {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const page = parseInt(params.query.page, 10);
    const size = parseInt(params.query.size, 10);
    const { fields, total } = await fetchMetricFields({
      esClient,
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
