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
 * Source: elasticsearch-specification repository, operations: query-rules-list-rulesets
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  query_rules_list_rulesets_request,
  query_rules_list_rulesets_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const QUERY_RULES_LIST_RULESETS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.list_rulesets',
  connectorGroup: 'internal',
  summary: `Get all query rulesets`,
  description: `Get all query rulesets.

Get summarized information about the query rulesets.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-list-rulesets`,
  methods: ['GET'],
  patterns: ['_query_rules'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-list-rulesets',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['from', 'size'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(query_rules_list_rulesets_request, 'body'),
    ...getShapeAt(query_rules_list_rulesets_request, 'path'),
    ...getShapeAt(query_rules_list_rulesets_request, 'query'),
  }),
  outputSchema: query_rules_list_rulesets_response,
};
