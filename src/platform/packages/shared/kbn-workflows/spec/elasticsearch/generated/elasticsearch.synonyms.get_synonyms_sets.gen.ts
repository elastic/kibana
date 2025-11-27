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
 * Generated at: 2025-11-27T07:43:24.923Z
 * Source: elasticsearch-specification repository, operations: synonyms-get-synonyms-sets
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  synonyms_get_synonyms_sets_request,
  synonyms_get_synonyms_sets_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SYNONYMS_GET_SYNONYMS_SETS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.get_synonyms_sets',
  connectorGroup: 'internal',
  summary: `Get all synonym sets`,
  description: `Get all synonym sets.

Get a summary of all defined synonym sets.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-get-synonym`,
  methods: ['GET'],
  patterns: ['_synonyms'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-get-synonym',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['from', 'size'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(synonyms_get_synonyms_sets_request, 'body'),
    ...getShapeAt(synonyms_get_synonyms_sets_request, 'path'),
    ...getShapeAt(synonyms_get_synonyms_sets_request, 'query'),
  }),
  outputSchema: synonyms_get_synonyms_sets_response,
};
