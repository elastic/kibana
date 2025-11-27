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
 * Generated at: 2025-11-27T07:04:28.255Z
 * Source: elasticsearch-specification repository, operations: snapshot-clone
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { snapshot_clone_request, snapshot_clone_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_CLONE_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.clone',
  connectorGroup: 'internal',
  summary: `Clone a snapshot`,
  description: `Clone a snapshot.

Clone part of all of a snapshot into another snapshot in the same repository.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-clone`,
  methods: ['PUT'],
  patterns: ['_snapshot/{repository}/{snapshot}/_clone/{target_snapshot}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-clone',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository', 'snapshot', 'target_snapshot'],
    urlParams: ['master_timeout'],
    bodyParams: ['indices'],
  },
  paramsSchema: z.object({
    ...getShapeAt(snapshot_clone_request, 'body'),
    ...getShapeAt(snapshot_clone_request, 'path'),
    ...getShapeAt(snapshot_clone_request, 'query'),
  }),
  outputSchema: snapshot_clone_response,
};
