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
 * Generated at: 2025-11-27T07:43:24.922Z
 * Source: elasticsearch-specification repository, operations: synonyms-delete-synonym-rule
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  synonyms_delete_synonym_rule_request,
  synonyms_delete_synonym_rule_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SYNONYMS_DELETE_SYNONYM_RULE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.delete_synonym_rule',
  connectorGroup: 'internal',
  summary: `Delete a synonym rule`,
  description: `Delete a synonym rule.

Delete a synonym rule from a synonym set.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-delete-synonym-rule`,
  methods: ['DELETE'],
  patterns: ['_synonyms/{set_id}/{rule_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-delete-synonym-rule',
  parameterTypes: {
    headerParams: [],
    pathParams: ['set_id', 'rule_id'],
    urlParams: ['refresh'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(synonyms_delete_synonym_rule_request, 'body'),
    ...getShapeAt(synonyms_delete_synonym_rule_request, 'path'),
    ...getShapeAt(synonyms_delete_synonym_rule_request, 'query'),
  }),
  outputSchema: synonyms_delete_synonym_rule_response,
};
