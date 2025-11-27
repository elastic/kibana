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
 * Generated at: 2025-11-27T07:43:24.875Z
 * Source: elasticsearch-specification repository, operations: indices-exists-template
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { indices_exists_template_request } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_EXISTS_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.exists_template',
  connectorGroup: 'internal',
  summary: `Check existence of index templates`,
  description: `Check existence of index templates.

Get information about whether index templates exist.
Index templates define settings, mappings, and aliases that can be applied automatically to new indices.

IMPORTANT: This documentation is about legacy index templates, which are deprecated and will be replaced by the composable templates introduced in Elasticsearch 7.8.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists-template`,
  methods: ['HEAD'],
  patterns: ['_template/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['flat_settings', 'local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_exists_template_request, 'body'),
    ...getShapeAt(indices_exists_template_request, 'path'),
    ...getShapeAt(indices_exists_template_request, 'query'),
  }),
  outputSchema: z.optional(z.looseObject({})),
};
