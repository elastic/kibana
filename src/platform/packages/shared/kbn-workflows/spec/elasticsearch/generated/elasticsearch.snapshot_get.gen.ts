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
 * Source: elasticsearch-specification repository, operations: snapshot-get
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { snapshot_get_request, snapshot_get_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.get',
  summary: `Get snapshot information`,
  description: `Get snapshot information.

NOTE: The \`after\` parameter and \`next\` field enable you to iterate through snapshots with some consistency guarantees regarding concurrent creation or deletion of snapshots.
It is guaranteed that any snapshot that exists at the beginning of the iteration and is not concurrently deleted will be seen during the iteration.
Snapshots concurrently created may be seen during an iteration.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-get`,
  methods: ['GET'],
  patterns: ['_snapshot/{repository}/{snapshot}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-get',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository', 'snapshot'],
    urlParams: [
      'after',
      'from_sort_value',
      'ignore_unavailable',
      'index_details',
      'index_names',
      'include_repository',
      'master_timeout',
      'order',
      'offset',
      'size',
      'slm_policy_filter',
      'sort',
      'state',
      'verbose',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(snapshot_get_request, 'body'),
    ...getShapeAt(snapshot_get_request, 'path'),
    ...getShapeAt(snapshot_get_request, 'query'),
  }),
  outputSchema: snapshot_get_response,
};
