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
 * Source: elasticsearch-specification repository, operations: query-rules-put-ruleset
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  query_rules_put_ruleset_request,
  query_rules_put_ruleset_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const QUERY_RULES_PUT_RULESET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.query_rules.put_ruleset',
  summary: `Create or update a query ruleset`,
  description: `Create or update a query ruleset.

There is a limit of 100 rules per ruleset.
This limit can be increased by using the \`xpack.applications.rules.max_rules_per_ruleset\` cluster setting.

IMPORTANT: Due to limitations within pinned queries, you can only select documents using \`ids\` or \`docs\`, but cannot use both in single rule.
It is advised to use one or the other in query rulesets, to avoid errors.
Additionally, pinned queries have a maximum limit of 100 pinned hits.
If multiple matching rules pin more than 100 documents, only the first 100 documents are pinned in the order they are specified in the ruleset.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-put-ruleset`,
  methods: ['PUT'],
  patterns: ['_query_rules/{ruleset_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-query-rules-put-ruleset',
  parameterTypes: {
    headerParams: [],
    pathParams: ['ruleset_id'],
    urlParams: [],
    bodyParams: ['rules'],
  },
  paramsSchema: z.object({
    ...getShapeAt(query_rules_put_ruleset_request, 'body'),
    ...getShapeAt(query_rules_put_ruleset_request, 'path'),
    ...getShapeAt(query_rules_put_ruleset_request, 'query'),
  }),
  outputSchema: query_rules_put_ruleset_response,
};
