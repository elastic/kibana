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
import { getIndexPatternMetadata } from './get_index_pattern_metadata';

export const getIndexPatternMetadataRoute = createRoute({
  endpoint: 'GET /internal/metrics_experience/index_pattern_metadata/{indexPattern}',
  security: { authz: { requiredPrivileges: ['read'] } },
  params: z.object({
    path: z.object({
      indexPattern: z.string(),
    }),
    query: z.object({
      to: z.string().datetime().default(dateMathParse('now')!.toISOString()).transform(isoToEpoch),
      from: z
        .string()
        .datetime()
        .default(dateMathParse('now-15m', { roundUp: true })!.toISOString())
        .transform(isoToEpoch),
    }),
  }),
  handler: async ({ context, params, logger }) => {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;

    const { indexPattern } = params.path;
    const { from, to } = params.query;

    const indexPatternMetadata = await getIndexPatternMetadata({
      esClient: createTracedEsClient({
        logger,
        client: esClient,
        plugin: 'metrics_experience',
      }),
      indexPattern,
      from,
      to,
    });

    return {
      indexPatternMetadata,
    };
  },
});

export const indexPatternMetadataRoutes = {
  ...getIndexPatternMetadataRoute,
};
