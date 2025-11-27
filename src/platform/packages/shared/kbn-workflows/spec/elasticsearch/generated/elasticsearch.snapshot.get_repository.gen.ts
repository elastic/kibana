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
 * Generated at: 2025-11-27T07:43:24.921Z
 * Source: elasticsearch-specification repository, operations: snapshot-get-repository, snapshot-get-repository-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  snapshot_get_repository1_request,
  snapshot_get_repository1_response,
  snapshot_get_repository_request,
  snapshot_get_repository_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_GET_REPOSITORY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.get_repository',
  connectorGroup: 'internal',
  summary: `Get snapshot repository information`,
  description: `Get snapshot repository information.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-get-repository`,
  methods: ['GET'],
  patterns: ['_snapshot', '_snapshot/{repository}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-get-repository',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository'],
    urlParams: ['local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(snapshot_get_repository_request, 'body'),
      ...getShapeAt(snapshot_get_repository_request, 'path'),
      ...getShapeAt(snapshot_get_repository_request, 'query'),
    }),
    z.object({
      ...getShapeAt(snapshot_get_repository1_request, 'body'),
      ...getShapeAt(snapshot_get_repository1_request, 'path'),
      ...getShapeAt(snapshot_get_repository1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([snapshot_get_repository_response, snapshot_get_repository1_response]),
};
