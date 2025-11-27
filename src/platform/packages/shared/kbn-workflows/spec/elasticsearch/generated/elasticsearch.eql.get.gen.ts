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
 * Source: elasticsearch-specification repository, operations: eql-get
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { eql_get_request, eql_get_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const EQL_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.eql.get',
  connectorGroup: 'internal',
  summary: `Get async EQL search results`,
  description: `Get async EQL search results.

Get the current status and available results for an async EQL search or a stored synchronous EQL search.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-get`,
  methods: ['GET'],
  patterns: ['_eql/search/{id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-get',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['keep_alive', 'wait_for_completion_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(eql_get_request, 'body'),
    ...getShapeAt(eql_get_request, 'path'),
    ...getShapeAt(eql_get_request, 'query'),
  }),
  outputSchema: eql_get_response,
};
