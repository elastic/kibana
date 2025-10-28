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
import { createRoute } from '../create_route';
import { getIndexPatternMetadata } from './get_index_pattern_metadata';
import { throwNotFoundIfMetricsExperienceDisabled } from '../../lib/utils';

export const getIndexPatternMetadataRoute = createRoute({
  endpoint: 'GET /internal/metrics_experience/index_pattern_metadata/{indexPattern}',
  security: { authz: { requiredPrivileges: ['read'] } },
  params: z.object({
    path: z.object({
      indexPattern: z.string(),
    }),
  }),
  handler: async ({ context, params, logger }) => {
    const { elasticsearch, featureFlags } = await context.core;
    await throwNotFoundIfMetricsExperienceDisabled(featureFlags);

    const esClient = elasticsearch.client.asCurrentUser;

    const { indexPattern } = params.path;

    const indexPatternMetadata = await getIndexPatternMetadata({
      esClient: createTracedEsClient({
        logger,
        client: esClient,
        plugin: 'metrics_experience',
      }),
      indexPattern,
    });

    return indexPatternMetadata;
  },
});

export const indexPatternMetadataRoutes = {
  ...getIndexPatternMetadataRoute,
};
