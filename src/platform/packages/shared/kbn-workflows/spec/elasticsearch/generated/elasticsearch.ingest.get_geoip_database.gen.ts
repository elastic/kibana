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
 * Source: elasticsearch-specification repository, operations: ingest-get-geoip-database, ingest-get-geoip-database-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ingest_get_geoip_database1_request,
  ingest_get_geoip_database1_response,
  ingest_get_geoip_database_request,
  ingest_get_geoip_database_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INGEST_GET_GEOIP_DATABASE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.get_geoip_database',
  connectorGroup: 'internal',
  summary: `Get GeoIP database configurations`,
  description: `Get GeoIP database configurations.

Get information about one or more IP geolocation database configurations.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-get-geoip-database`,
  methods: ['GET'],
  patterns: ['_ingest/geoip/database', '_ingest/geoip/database/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-get-geoip-database',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ingest_get_geoip_database_request, 'body'),
      ...getShapeAt(ingest_get_geoip_database_request, 'path'),
      ...getShapeAt(ingest_get_geoip_database_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ingest_get_geoip_database1_request, 'body'),
      ...getShapeAt(ingest_get_geoip_database1_request, 'path'),
      ...getShapeAt(ingest_get_geoip_database1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([ingest_get_geoip_database_response, ingest_get_geoip_database1_response]),
};
