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
 * Source: elasticsearch-specification repository, operations: indices-delete-index-template
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_delete_index_template_request,
  indices_delete_index_template_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_DELETE_INDEX_TEMPLATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete_index_template',
  summary: `Delete an index template`,
  description: `Delete an index template.

The provided <index-template> may contain multiple template names separated by a comma. If multiple template
names are specified then there is no wildcard support and the provided names should match completely with
existing templates.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-index-template`,
  methods: ['DELETE'],
  patterns: ['_index_template/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete-index-template',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_delete_index_template_request, 'body'),
    ...getShapeAt(indices_delete_index_template_request, 'path'),
    ...getShapeAt(indices_delete_index_template_request, 'query'),
  }),
  outputSchema: indices_delete_index_template_response,
};
