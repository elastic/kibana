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
 * Source: elasticsearch-specification repository, operations: indices-exists-index-template
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { indices_exists_index_template_request } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_EXISTS_INDEX_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.exists_index_template',
  connectorGroup: 'internal',
  summary: `Check index templates`,
  description: `Check index templates.

Check whether index templates exist.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists-index-template`,
  methods: ['HEAD'],
  patterns: ['_index_template/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-exists-index-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['local', 'flat_settings', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_exists_index_template_request, 'body'),
    ...getShapeAt(indices_exists_index_template_request, 'path'),
    ...getShapeAt(indices_exists_index_template_request, 'query'),
  }),
  outputSchema: z.optional(z.looseObject({})),
};
