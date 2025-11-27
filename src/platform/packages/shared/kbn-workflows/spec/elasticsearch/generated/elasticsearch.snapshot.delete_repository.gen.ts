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
 * Generated at: 2025-11-27T07:43:24.920Z
 * Source: elasticsearch-specification repository, operations: snapshot-delete-repository
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  snapshot_delete_repository_request,
  snapshot_delete_repository_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_DELETE_REPOSITORY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.delete_repository',
  connectorGroup: 'internal',
  summary: `Delete snapshot repositories`,
  description: `Delete snapshot repositories.

When a repository is unregistered, Elasticsearch removes only the reference to the location where the repository is storing the snapshots.
The snapshots themselves are left untouched and in place.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-delete-repository`,
  methods: ['DELETE'],
  patterns: ['_snapshot/{repository}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-delete-repository',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(snapshot_delete_repository_request, 'body'),
    ...getShapeAt(snapshot_delete_repository_request, 'path'),
    ...getShapeAt(snapshot_delete_repository_request, 'query'),
  }),
  outputSchema: snapshot_delete_repository_response,
};
