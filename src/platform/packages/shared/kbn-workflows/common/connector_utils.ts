/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { FetcherConfigSchema } from '../spec/schema';
import type { InternalConnectorContract } from '../types/v1';

/**
 * Enhances Kibana connectors with the fetcher parameter
 * This adds optional HTTP configuration to all Kibana API endpoints
 */
export function enhanceKibanaConnectorsWithFetcher(
  connectors: InternalConnectorContract[]
): InternalConnectorContract[] {
  return connectors.map((connector) => {
    // Only enhance Kibana connectors (type starts with "kibana.")
    if (!connector.type.startsWith('kibana.')) {
      return connector;
    }

    // Extend the paramsSchema with fetcher
    const enhancedParamsSchema =
      connector.paramsSchema instanceof z.ZodObject
        ? connector.paramsSchema.extend({ fetcher: FetcherConfigSchema })
        : z.intersection(connector.paramsSchema, z.object({ fetcher: FetcherConfigSchema }));

    return {
      ...connector,
      paramsSchema: enhancedParamsSchema,
    };
  });
}
