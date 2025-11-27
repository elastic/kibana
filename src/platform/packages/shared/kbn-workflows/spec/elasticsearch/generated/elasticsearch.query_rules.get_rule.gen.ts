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
 * Generated at: 2025-11-27T07:43:24.905Z
 * Source: elasticsearch-specification repository, operations: query-rules-get-rule
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { query_rules_get_rule_request, query_rules_get_rule_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const QUERY_RULES_GET_RULE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.get_rule',
  connectorGroup: 'internal',
  summary: `Get a query rule`,
  description: `Get a query rule.

Get details about a query rule within a query ruleset.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-get-rule`,
  methods: ['GET'],
  patterns: ['_query_rules/{ruleset_id}/_rule/{rule_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-get-rule',
  parameterTypes: {
    headerParams: [],
    pathParams: ['ruleset_id', 'rule_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(query_rules_get_rule_request, 'body'),
    ...getShapeAt(query_rules_get_rule_request, 'path'),
    ...getShapeAt(query_rules_get_rule_request, 'query'),
  }),
  outputSchema: query_rules_get_rule_response,
};
