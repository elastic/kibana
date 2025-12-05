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
 * Source: elasticsearch-specification repository, operations: query-rules-delete-rule
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  query_rules_delete_rule_request,
  query_rules_delete_rule_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const QUERY_RULES_DELETE_RULE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.delete_rule',
  summary: `Delete a query rule`,
  description: `Delete a query rule.

Delete a query rule within a query ruleset.
This is a destructive action that is only recoverable by re-adding the same rule with the create or update query rule API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-delete-rule`,
  methods: ['DELETE'],
  patterns: ['_query_rules/{ruleset_id}/_rule/{rule_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-delete-rule',
  parameterTypes: {
    headerParams: [],
    pathParams: ['ruleset_id', 'rule_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(query_rules_delete_rule_request, 'body'),
    ...getShapeAt(query_rules_delete_rule_request, 'path'),
    ...getShapeAt(query_rules_delete_rule_request, 'query'),
  }),
  outputSchema: query_rules_delete_rule_response,
};
