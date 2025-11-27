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
 * Generated at: 2025-11-27T07:04:28.258Z
 * Source: elasticsearch-specification repository, operations: synonyms-put-synonym-rule
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  synonyms_put_synonym_rule_request,
  synonyms_put_synonym_rule_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SYNONYMS_PUT_SYNONYM_RULE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.put_synonym_rule',
  connectorGroup: 'internal',
  summary: `Create or update a synonym rule`,
  description: `Create or update a synonym rule.

Create or update a synonym rule in a synonym set.

If any of the synonym rules included is invalid, the API returns an error.

When you update a synonym rule, all analyzers using the synonyms set will be reloaded automatically to reflect the new rule.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-put-synonym-rule`,
  methods: ['PUT'],
  patterns: ['_synonyms/{set_id}/{rule_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-put-synonym-rule',
  parameterTypes: {
    headerParams: [],
    pathParams: ['set_id', 'rule_id'],
    urlParams: ['refresh'],
    bodyParams: ['synonyms'],
  },
  paramsSchema: z.object({
    ...getShapeAt(synonyms_put_synonym_rule_request, 'body'),
    ...getShapeAt(synonyms_put_synonym_rule_request, 'path'),
    ...getShapeAt(synonyms_put_synonym_rule_request, 'query'),
  }),
  outputSchema: synonyms_put_synonym_rule_response,
};
