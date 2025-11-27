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
 * Generated at: 2025-11-27T07:04:28.208Z
 * Source: elasticsearch-specification repository, operations: eql-get-status
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { eql_get_status_request, eql_get_status_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const EQL_GET_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.eql.get_status',
  connectorGroup: 'internal',
  summary: `Get the async EQL status`,
  description: `Get the async EQL status.

Get the current status for an async EQL search or a stored synchronous EQL search without returning results.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-get-status`,
  methods: ['GET'],
  patterns: ['_eql/search/status/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-get-status',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(eql_get_status_request, 'body'),
    ...getShapeAt(eql_get_status_request, 'path'),
    ...getShapeAt(eql_get_status_request, 'query'),
  }),
  outputSchema: eql_get_status_response,
};
