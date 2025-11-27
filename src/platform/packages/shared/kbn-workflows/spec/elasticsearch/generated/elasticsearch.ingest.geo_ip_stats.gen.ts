/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * Generated at: 2025-11-27T07:04:28.230Z
 * Source: elasticsearch-specification repository, operations: ingest-geo-ip-stats
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ingest_geo_ip_stats_request, ingest_geo_ip_stats_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INGEST_GEO_IP_STATS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.geo_ip_stats',
  connectorGroup: 'internal',
  summary: `Get GeoIP statistics`,
  description: `Get GeoIP statistics.

Get download statistics for GeoIP2 databases that are used with the GeoIP processor.

 Documentation: https://www.elastic.co/docs/reference/enrich-processor/geoip-processor`,
  methods: ['GET'],
  patterns: ['_ingest/geoip/stats'],
  documentation: 'https://www.elastic.co/docs/reference/enrich-processor/geoip-processor',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ingest_geo_ip_stats_request, 'body'),
    ...getShapeAt(ingest_geo_ip_stats_request, 'path'),
    ...getShapeAt(ingest_geo_ip_stats_request, 'query'),
  }),
  outputSchema: ingest_geo_ip_stats_response,
};
