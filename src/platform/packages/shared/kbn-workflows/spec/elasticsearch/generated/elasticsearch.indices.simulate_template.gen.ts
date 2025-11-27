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
 * Generated at: 2025-11-27T07:04:28.226Z
 * Source: elasticsearch-specification repository, operations: indices-simulate-template, indices-simulate-template-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_simulate_template1_request,
  indices_simulate_template1_response,
  indices_simulate_template_request,
  indices_simulate_template_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_SIMULATE_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.simulate_template',
  connectorGroup: 'internal',
  summary: `Simulate an index template`,
  description: `Simulate an index template.

Get the index configuration that would be applied by a particular index template.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-simulate-template`,
  methods: ['POST'],
  patterns: ['_index_template/_simulate', '_index_template/_simulate/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-simulate-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['create', 'cause', 'master_timeout', 'include_defaults'],
    bodyParams: [
      'allow_auto_create',
      'index_patterns',
      'composed_of',
      'template',
      'data_stream',
      'priority',
      'version',
      '_meta',
      'ignore_missing_component_templates',
      'deprecated',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_simulate_template_request, 'body'),
      ...getShapeAt(indices_simulate_template_request, 'path'),
      ...getShapeAt(indices_simulate_template_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_simulate_template1_request, 'body'),
      ...getShapeAt(indices_simulate_template1_request, 'path'),
      ...getShapeAt(indices_simulate_template1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_simulate_template_response, indices_simulate_template1_response]),
};
