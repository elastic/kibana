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
 * Source: elasticsearch-specification repository, operations: snapshot-cleanup-repository
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  snapshot_cleanup_repository_request,
  snapshot_cleanup_repository_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_CLEANUP_REPOSITORY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.cleanup_repository',
  connectorGroup: 'internal',
  summary: `Clean up the snapshot repository`,
  description: `Clean up the snapshot repository.

Trigger the review of the contents of a snapshot repository and delete any stale data not referenced by existing snapshots.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-cleanup-repository`,
  methods: ['POST'],
  patterns: ['_snapshot/{repository}/_cleanup'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-cleanup-repository',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(snapshot_cleanup_repository_request, 'body'),
    ...getShapeAt(snapshot_cleanup_repository_request, 'path'),
    ...getShapeAt(snapshot_cleanup_repository_request, 'query'),
  }),
  outputSchema: snapshot_cleanup_repository_response,
};
