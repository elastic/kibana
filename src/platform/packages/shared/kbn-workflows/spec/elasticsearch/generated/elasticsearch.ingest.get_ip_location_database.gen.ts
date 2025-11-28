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
 * Source: elasticsearch-specification repository, operations: ingest-get-ip-location-database, ingest-get-ip-location-database-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';
import type { InternalConnectorContract } from '../../../types/latest';

import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import {
  ingest_get_ip_location_database_request,
  ingest_get_ip_location_database_response,
  ingest_get_ip_location_database1_request,
  ingest_get_ip_location_database1_response,
} from './schemas/es_openapi_zod.gen';

// export contract
export const INGEST_GET_IP_LOCATION_DATABASE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.get_ip_location_database',
  connectorGroup: 'internal',
  summary: `Get IP geolocation database configurations`,
  description: `Get IP geolocation database configurations.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-get-ip-location-database`,
  methods: ['GET'],
  patterns: ['_ingest/ip_location/database', '_ingest/ip_location/database/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-get-ip-location-database',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(ingest_get_ip_location_database_request, 'body'),
      ...getShapeAt(ingest_get_ip_location_database_request, 'path'),
      ...getShapeAt(ingest_get_ip_location_database_request, 'query'),
    }),
    z.object({
      ...getShapeAt(ingest_get_ip_location_database1_request, 'body'),
      ...getShapeAt(ingest_get_ip_location_database1_request, 'path'),
      ...getShapeAt(ingest_get_ip_location_database1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    ingest_get_ip_location_database_response,
    ingest_get_ip_location_database1_response,
  ]),
};
