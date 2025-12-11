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
 * Source: elasticsearch-specification repository, operations: connector-put, connector-put-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  connector_put1_request,
  connector_put1_response,
  connector_put_request,
  connector_put_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_PUT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.put',
  summary: `Create or update a connector`,
  description: `Create or update a connector.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-put`,
  methods: ['PUT'],
  patterns: ['_connector/{connector_id}', '_connector'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-put',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_id'],
    urlParams: [],
    bodyParams: ['description', 'index_name', 'is_native', 'language', 'name', 'service_type'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(connector_put_request, 'body'),
      ...getShapeAt(connector_put_request, 'path'),
      ...getShapeAt(connector_put_request, 'query'),
    }),
    z.object({
      ...getShapeAt(connector_put1_request, 'body'),
      ...getShapeAt(connector_put1_request, 'path'),
      ...getShapeAt(connector_put1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([connector_put_response, connector_put1_response]),
};
