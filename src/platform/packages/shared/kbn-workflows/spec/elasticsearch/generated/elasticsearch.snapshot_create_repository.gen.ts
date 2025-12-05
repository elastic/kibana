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
 * Source: elasticsearch-specification repository, operations: snapshot-create-repository, snapshot-create-repository-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  snapshot_create_repository1_request,
  snapshot_create_repository1_response,
  snapshot_create_repository_request,
  snapshot_create_repository_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_CREATE_REPOSITORY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.create_repository',
  summary: `Create or update a snapshot repository`,
  description: `Create or update a snapshot repository.

IMPORTANT: If you are migrating searchable snapshots, the repository name must be identical in the source and destination clusters.
To register a snapshot repository, the cluster's global metadata must be writeable.
Ensure there are no cluster blocks (for example, \`cluster.blocks.read_only\` and \`clsuter.blocks.read_only_allow_delete\` settings) that prevent write access.

Several options for this API can be specified using a query parameter or a request body parameter.
If both parameters are specified, only the query parameter is used.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-create-repository`,
  methods: ['PUT', 'POST'],
  patterns: ['_snapshot/{repository}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-create-repository',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository'],
    urlParams: ['master_timeout', 'timeout', 'verify'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(snapshot_create_repository_request, 'body'),
      ...getShapeAt(snapshot_create_repository_request, 'path'),
      ...getShapeAt(snapshot_create_repository_request, 'query'),
    }),
    z.object({
      ...getShapeAt(snapshot_create_repository1_request, 'body'),
      ...getShapeAt(snapshot_create_repository1_request, 'path'),
      ...getShapeAt(snapshot_create_repository1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    snapshot_create_repository_response,
    snapshot_create_repository1_response,
  ]),
};
