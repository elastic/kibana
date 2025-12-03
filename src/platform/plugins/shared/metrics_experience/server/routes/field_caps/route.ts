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
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import { createRoute } from '../create_route';
import { throwNotFoundIfMetricsExperienceDisabled } from '../../lib/utils';
import { retrieveFieldCaps } from '../../lib/fields/retrieve_fieldcaps';

export const getFieldCapsRoute = createRoute({
  endpoint: 'GET /internal/metrics_experience/field_caps',
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
    }),
  }),
  handler: async ({ context, params, logger, request }) => {
    const { elasticsearch, featureFlags } = await context.core;
    await throwNotFoundIfMetricsExperienceDisabled(featureFlags);

    const esClient = elasticsearch.client.asCurrentUser;

    const indexFieldCapsMap = await retrieveFieldCaps({
      esClient: createTracedEsClient({
        logger,
        client: esClient,
        plugin: 'metrics_experience',
        abortSignal: getRequestAbortedSignal(request.events.aborted$),
      }).client,
      indexPattern: params.query.index,
      timerange: { from: params.query.from, to: params.query.to },
    });

    const response: Record<string, Record<string, Record<string, FieldCapsFieldCapability>>> = {};
    for (const [index, fields] of indexFieldCapsMap) {
      const filteredFields: Record<string, Record<string, FieldCapsFieldCapability>> = {};
      for (const fieldName of Object.keys(fields)) {
        const fieldCapsByType = fields[fieldName];
        let includeField = false;
        for (const type of Object.keys(fieldCapsByType)) {
          const typeCaps = fieldCapsByType[type];
          if (typeCaps.time_series_metric || typeCaps.time_series_dimension) {
            includeField = true;
            break;
          }
        }
        if (includeField) {
          filteredFields[fieldName] = fieldCapsByType;
        }
      }
      if (Object.keys(filteredFields).length > 0) {
        response[index] = filteredFields;
      }
    }

    return response;
  },
});

export const fieldCapsRoutes = {
  ...getFieldCapsRoute,
};
