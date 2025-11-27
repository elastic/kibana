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
 * Generated at: 2025-11-27T07:04:28.256Z
 * Source: elasticsearch-specification repository, operations: snapshot-delete
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { snapshot_delete_request, snapshot_delete_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_DELETE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.delete',
  connectorGroup: 'internal',
  summary: `Delete snapshots`,
  description: `Delete snapshots.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-delete`,
  methods: ['DELETE'],
  patterns: ['_snapshot/{repository}/{snapshot}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-delete',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository', 'snapshot'],
    urlParams: ['master_timeout', 'wait_for_completion'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(snapshot_delete_request, 'body'),
    ...getShapeAt(snapshot_delete_request, 'path'),
    ...getShapeAt(snapshot_delete_request, 'query'),
  }),
  outputSchema: snapshot_delete_response,
};
