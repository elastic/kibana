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
 * Generated at: 2025-11-27T07:04:28.247Z
 * Source: elasticsearch-specification repository, operations: searchable-snapshots-mount
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  searchable_snapshots_mount_request,
  searchable_snapshots_mount_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SEARCHABLE_SNAPSHOTS_MOUNT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.searchable_snapshots.mount',
  connectorGroup: 'internal',
  summary: `Mount a snapshot`,
  description: `Mount a snapshot.

Mount a snapshot as a searchable snapshot index.
Do not use this API for snapshots managed by index lifecycle management (ILM).
Manually mounting ILM-managed snapshots can interfere with ILM processes.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-mount`,
  methods: ['POST'],
  patterns: ['_snapshot/{repository}/{snapshot}/_mount'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-mount',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository', 'snapshot'],
    urlParams: ['master_timeout', 'wait_for_completion', 'storage'],
    bodyParams: ['index', 'renamed_index', 'index_settings', 'ignore_index_settings'],
  },
  paramsSchema: z.object({
    ...getShapeAt(searchable_snapshots_mount_request, 'body'),
    ...getShapeAt(searchable_snapshots_mount_request, 'path'),
    ...getShapeAt(searchable_snapshots_mount_request, 'query'),
  }),
  outputSchema: searchable_snapshots_mount_response,
};
