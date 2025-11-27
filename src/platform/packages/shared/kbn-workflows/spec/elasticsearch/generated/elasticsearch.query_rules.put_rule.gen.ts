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
 * Generated at: 2025-11-27T07:04:28.243Z
 * Source: elasticsearch-specification repository, operations: query-rules-put-rule
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { query_rules_put_rule_request, query_rules_put_rule_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const QUERY_RULES_PUT_RULE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.put_rule',
  connectorGroup: 'internal',
  summary: `Create or update a query rule`,
  description: `Create or update a query rule.

Create or update a query rule within a query ruleset.

IMPORTANT: Due to limitations within pinned queries, you can only pin documents using ids or docs, but cannot use both in single rule.
It is advised to use one or the other in query rulesets, to avoid errors.
Additionally, pinned queries have a maximum limit of 100 pinned hits.
If multiple matching rules pin more than 100 documents, only the first 100 documents are pinned in the order they are specified in the ruleset.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-put-rule`,
  methods: ['PUT'],
  patterns: ['_query_rules/{ruleset_id}/_rule/{rule_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-put-rule',
  parameterTypes: {
    headerParams: [],
    pathParams: ['ruleset_id', 'rule_id'],
    urlParams: [],
    bodyParams: ['type', 'criteria', 'actions', 'priority'],
  },
  paramsSchema: z.object({
    ...getShapeAt(query_rules_put_rule_request, 'body'),
    ...getShapeAt(query_rules_put_rule_request, 'path'),
    ...getShapeAt(query_rules_put_rule_request, 'query'),
  }),
  outputSchema: query_rules_put_rule_response,
};
