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
 * Source: elasticsearch-specification repository, operations: indices-delete
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { indices_delete_request, indices_delete_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.delete',
  summary: `Delete indices`,
  description: `Delete indices.

Deleting an index deletes its documents, shards, and metadata.
It does not delete related Kibana components, such as data views, visualizations, or dashboards.

You cannot delete the current write index of a data stream.
To delete the index, you must roll over the data stream so a new write index is created.
You can then use the delete index API to delete the previous write index.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete`,
  methods: ['DELETE'],
  patterns: ['{index}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-delete',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
      'master_timeout',
      'timeout',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_delete_request, 'body'),
    ...getShapeAt(indices_delete_request, 'path'),
    ...getShapeAt(indices_delete_request, 'query'),
  }),
  outputSchema: indices_delete_response,
};
