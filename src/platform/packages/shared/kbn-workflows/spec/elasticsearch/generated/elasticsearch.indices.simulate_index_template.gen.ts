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
 * Generated at: 2025-11-27T07:43:24.884Z
 * Source: elasticsearch-specification repository, operations: indices-simulate-index-template
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_simulate_index_template_request,
  indices_simulate_index_template_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_SIMULATE_INDEX_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.simulate_index_template',
  connectorGroup: 'internal',
  summary: `Simulate an index`,
  description: `Simulate an index.

Get the index configuration that would be applied to the specified index from an existing index template.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-simulate-index-template`,
  methods: ['POST'],
  patterns: ['_index_template/_simulate_index/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-simulate-index-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['create', 'cause', 'master_timeout', 'include_defaults'],
    bodyParams: [
      'index_patterns',
      'composed_of',
      'template',
      'version',
      'priority',
      '_meta',
      'allow_auto_create',
      'data_stream',
      'deprecated',
      'ignore_missing_component_templates',
      'created_date',
      'created_date_millis',
      'modified_date',
      'modified_date_millis',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_simulate_index_template_request, 'body'),
    ...getShapeAt(indices_simulate_index_template_request, 'path'),
    ...getShapeAt(indices_simulate_index_template_request, 'query'),
  }),
  outputSchema: indices_simulate_index_template_response,
};
