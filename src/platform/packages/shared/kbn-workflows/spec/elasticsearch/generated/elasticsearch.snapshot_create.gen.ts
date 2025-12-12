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
 * Source: elasticsearch-specification repository, operations: snapshot-create, snapshot-create-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  snapshot_create1_request,
  snapshot_create1_response,
  snapshot_create_request,
  snapshot_create_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_CREATE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.create',
  summary: `Create a snapshot`,
  description: `Create a snapshot.

Take a snapshot of a cluster or of data streams and indices.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-create`,
  methods: ['PUT', 'POST'],
  patterns: ['_snapshot/{repository}/{snapshot}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-create',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository', 'snapshot'],
    urlParams: ['master_timeout', 'wait_for_completion'],
    bodyParams: [
      'expand_wildcards',
      'feature_states',
      'ignore_unavailable',
      'include_global_state',
      'indices',
      'metadata',
      'partial',
    ],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(snapshot_create_request, 'body'),
      ...getShapeAt(snapshot_create_request, 'path'),
      ...getShapeAt(snapshot_create_request, 'query'),
    }),
    z.object({
      ...getShapeAt(snapshot_create1_request, 'body'),
      ...getShapeAt(snapshot_create1_request, 'path'),
      ...getShapeAt(snapshot_create1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([snapshot_create_response, snapshot_create1_response]),
};
