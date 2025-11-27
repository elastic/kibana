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
 * Source: elasticsearch-specification repository, operations: eql-delete
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { eql_delete_request, eql_delete_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const EQL_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.eql.delete',
  connectorGroup: 'internal',
  summary: `Delete an async EQL search`,
  description: `Delete an async EQL search.

Delete an async EQL search or a stored synchronous EQL search.
The API also deletes results for the search.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-delete`,
  methods: ['DELETE'],
  patterns: ['_eql/search/{id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-eql-delete',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(eql_delete_request, 'body'),
    ...getShapeAt(eql_delete_request, 'path'),
    ...getShapeAt(eql_delete_request, 'query'),
  }),
  outputSchema: eql_delete_response,
};
