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
 * Source: elasticsearch-specification repository, operations: explain, explain-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  explain1_request,
  explain1_response,
  explain_request,
  explain_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const EXPLAIN_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.explain',
  summary: `Explain a document match result`,
  description: `Explain a document match result.

Get information about why a specific document matches, or doesn't match, a query.
It computes a score explanation for a query and a specific document.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-explain`,
  methods: ['GET', 'POST'],
  patterns: ['{index}/_explain/{id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-explain',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index', 'id'],
    urlParams: [
      'analyzer',
      'analyze_wildcard',
      'default_operator',
      'df',
      'lenient',
      'preference',
      'routing',
      '_source',
      '_source_excludes',
      '_source_includes',
      'stored_fields',
      'q',
    ],
    bodyParams: ['query'],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(explain_request, 'body'),
      ...getShapeAt(explain_request, 'path'),
      ...getShapeAt(explain_request, 'query'),
    }),
    z.object({
      ...getShapeAt(explain1_request, 'body'),
      ...getShapeAt(explain1_request, 'path'),
      ...getShapeAt(explain1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([explain_response, explain1_response]),
};
