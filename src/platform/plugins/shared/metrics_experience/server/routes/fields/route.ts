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
import { getRequestAbortedSignal } from '@kbn/data-plugin/server';
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
  handler: async ({ context, params, logger, request }) => {
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
        abortSignal: getRequestAbortedSignal(request.events.aborted$),
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

export const searchFieldsRoute = createRoute({
  endpoint: 'POST /internal/metrics_experience/fields/_search',
  security: { authz: { requiredPrivileges: ['read'] } },
  params: z.object({
    body: z.object({
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
      kuery: z.string().optional(),
    }),
  }),
  handler: async ({ context, params, logger }) => {
    const { elasticsearch, featureFlags } = await context.core;
    await throwNotFoundIfMetricsExperienceDisabled(featureFlags);

    const esClient = elasticsearch.client.asCurrentUser;
    const { index, from, to, fields, page, size, kuery } = params.body;

    const { fields: resultFields, total } = await getMetricFields({
      esClient: createTracedEsClient({
        logger,
        client: esClient,
        plugin: 'metrics_experience',
      }),
      indexPattern: index,
      timerange: { from, to },
      fields,
      page,
      size,
      kuery,
      logger,
    });

    return {
      fields: resultFields,
      total,
      page,
    };
  },
});

export const fieldsRoutes = {
  ...getFieldsRoute,
  ...searchFieldsRoute,
};
