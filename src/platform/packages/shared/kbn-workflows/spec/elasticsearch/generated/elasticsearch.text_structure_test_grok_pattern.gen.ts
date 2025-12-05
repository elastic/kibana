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
 * Source: elasticsearch-specification repository, operations: text-structure-test-grok-pattern, text-structure-test-grok-pattern-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  text_structure_test_grok_pattern1_request,
  text_structure_test_grok_pattern1_response,
  text_structure_test_grok_pattern_request,
  text_structure_test_grok_pattern_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TEXT_STRUCTURE_TEST_GROK_PATTERN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.text_structure.test_grok_pattern',
  summary: `Test a Grok pattern`,
  description: `Test a Grok pattern.

Test a Grok pattern on one or more lines of text.
The API indicates whether the lines match the pattern together with the offsets and lengths of the matched substrings.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-text-structure-test-grok-pattern`,
  methods: ['GET', 'POST'],
  patterns: ['_text_structure/test_grok_pattern'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-text-structure-test-grok-pattern',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['ecs_compatibility'],
    bodyParams: ['grok_pattern', 'text'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(text_structure_test_grok_pattern_request, 'body'),
      ...getShapeAt(text_structure_test_grok_pattern_request, 'path'),
      ...getShapeAt(text_structure_test_grok_pattern_request, 'query'),
    }),
    z.object({
      ...getShapeAt(text_structure_test_grok_pattern1_request, 'body'),
      ...getShapeAt(text_structure_test_grok_pattern1_request, 'path'),
      ...getShapeAt(text_structure_test_grok_pattern1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    text_structure_test_grok_pattern_response,
    text_structure_test_grok_pattern1_response,
  ]),
};
