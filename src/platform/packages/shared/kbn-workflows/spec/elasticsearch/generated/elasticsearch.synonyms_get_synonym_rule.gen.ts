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
 * Source: elasticsearch-specification repository, operations: synonyms-get-synonym-rule
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  synonyms_get_synonym_rule_request,
  synonyms_get_synonym_rule_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SYNONYMS_GET_SYNONYM_RULE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.get_synonym_rule',
  summary: `Get a synonym rule`,
  description: `Get a synonym rule.

Get a synonym rule from a synonym set.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-get-synonym-rule`,
  methods: ['GET'],
  patterns: ['_synonyms/{set_id}/{rule_id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-get-synonym-rule',
  parameterTypes: {
    headerParams: [],
    pathParams: ['set_id', 'rule_id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(synonyms_get_synonym_rule_request, 'body'),
    ...getShapeAt(synonyms_get_synonym_rule_request, 'path'),
    ...getShapeAt(synonyms_get_synonym_rule_request, 'query'),
  }),
  outputSchema: synonyms_get_synonym_rule_response,
};
