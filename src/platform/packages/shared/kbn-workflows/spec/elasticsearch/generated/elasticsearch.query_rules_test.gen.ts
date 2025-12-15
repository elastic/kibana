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
 * Source: elasticsearch-specification repository, operations: query-rules-test
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { query_rules_test_request, query_rules_test_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const QUERY_RULES_TEST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.test',
  summary: `Test a query ruleset`,
  description: `Test a query ruleset.

Evaluate match criteria against a query ruleset to identify the rules that would match that criteria.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-test`,
  methods: ['POST'],
  patterns: ['_query_rules/{ruleset_id}/_test'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-test',
  parameterTypes: {
    headerParams: [],
    pathParams: ['ruleset_id'],
    urlParams: [],
    bodyParams: ['match_criteria'],
  },
  paramsSchema: z.object({
    ...getShapeAt(query_rules_test_request, 'body'),
    ...getShapeAt(query_rules_test_request, 'path'),
    ...getShapeAt(query_rules_test_request, 'query'),
  }),
  outputSchema: query_rules_test_response,
};
