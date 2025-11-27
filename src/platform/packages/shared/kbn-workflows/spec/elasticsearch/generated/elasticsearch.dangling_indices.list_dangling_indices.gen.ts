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
 * Generated at: 2025-11-27T07:43:24.867Z
 * Source: elasticsearch-specification repository, operations: dangling-indices-list-dangling-indices
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  dangling_indices_list_dangling_indices_request,
  dangling_indices_list_dangling_indices_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const DANGLING_INDICES_LIST_DANGLING_INDICES_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.dangling_indices.list_dangling_indices',
  connectorGroup: 'internal',
  summary: `Get the dangling indices`,
  description: `Get the dangling indices.

If Elasticsearch encounters index data that is absent from the current cluster state, those indices are considered to be dangling.
For example, this can happen if you delete more than \`cluster.indices.tombstones.size\` indices while an Elasticsearch node is offline.

Use this API to list dangling indices, which you can then import or delete.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-dangling-indices-list-dangling-indices`,
  methods: ['GET'],
  patterns: ['_dangling'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-dangling-indices-list-dangling-indices',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(dangling_indices_list_dangling_indices_request, 'body'),
    ...getShapeAt(dangling_indices_list_dangling_indices_request, 'path'),
    ...getShapeAt(dangling_indices_list_dangling_indices_request, 'query'),
  }),
  outputSchema: dangling_indices_list_dangling_indices_response,
};
