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
 * Source: elasticsearch-specification repository, operations: ingest-put-geoip-database
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ingest_put_geoip_database_request,
  ingest_put_geoip_database_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INGEST_PUT_GEOIP_DATABASE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ingest.put_geoip_database',
  summary: `Create or update a GeoIP database configuration`,
  description: `Create or update a GeoIP database configuration.

Refer to the create or update IP geolocation database configuration API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-put-geoip-database`,
  methods: ['PUT'],
  patterns: ['_ingest/geoip/database/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ingest-put-geoip-database',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: ['name', 'maxmind'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ingest_put_geoip_database_request, 'body'),
    ...getShapeAt(ingest_put_geoip_database_request, 'path'),
    ...getShapeAt(ingest_put_geoip_database_request, 'query'),
  }),
  outputSchema: ingest_put_geoip_database_response,
};
