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
 * Generated at: 2025-11-27T07:04:28.217Z
 * Source: elasticsearch-specification repository, operations: indices-delete-template
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_delete_template_request,
  indices_delete_template_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_DELETE_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete_template',
  connectorGroup: 'internal',
  summary: `Delete a legacy index template`,
  description: `Delete a legacy index template.

IMPORTANT: This documentation is about legacy index templates, which are deprecated and will be replaced by the composable templates introduced in Elasticsearch 7.8.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-template`,
  methods: ['DELETE'],
  patterns: ['_template/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_delete_template_request, 'body'),
    ...getShapeAt(indices_delete_template_request, 'path'),
    ...getShapeAt(indices_delete_template_request, 'query'),
  }),
  outputSchema: indices_delete_template_response,
};
