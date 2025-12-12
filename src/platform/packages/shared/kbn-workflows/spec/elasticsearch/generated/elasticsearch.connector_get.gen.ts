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
 * Source: elasticsearch-specification repository, operations: connector-get
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { connector_get_request, connector_get_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CONNECTOR_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.connector.get',
  summary: `Get a connector`,
  description: `Get a connector.

Get the details about a connector.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-get`,
  methods: ['GET'],
  patterns: ['_connector/{connector_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-connector-get',
  parameterTypes: {
    headerParams: [],
    pathParams: ['connector_id'],
    urlParams: ['include_deleted'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(connector_get_request, 'body'),
    ...getShapeAt(connector_get_request, 'path'),
    ...getShapeAt(connector_get_request, 'query'),
  }),
  outputSchema: connector_get_response,
};
