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
 * Source: elasticsearch-specification repository, operations: dangling-indices-import-dangling-index
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  dangling_indices_import_dangling_index_request,
  dangling_indices_import_dangling_index_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const DANGLING_INDICES_IMPORT_DANGLING_INDEX_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.dangling_indices.import_dangling_index',
  summary: `Import a dangling index`,
  description: `Import a dangling index.

If Elasticsearch encounters index data that is absent from the current cluster state, those indices are considered to be dangling.
For example, this can happen if you delete more than \`cluster.indices.tombstones.size\` indices while an Elasticsearch node is offline.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-dangling-indices-import-dangling-index`,
  methods: ['POST'],
  patterns: ['_dangling/{index_uuid}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-dangling-indices-import-dangling-index',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index_uuid'],
    urlParams: ['accept_data_loss', 'master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(dangling_indices_import_dangling_index_request, 'body'),
    ...getShapeAt(dangling_indices_import_dangling_index_request, 'path'),
    ...getShapeAt(dangling_indices_import_dangling_index_request, 'query'),
  }),
  outputSchema: dangling_indices_import_dangling_index_response,
};
