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
 * Generated at: 2025-11-27T07:04:28.257Z
 * Source: elasticsearch-specification repository, operations: snapshot-verify-repository
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  snapshot_verify_repository_request,
  snapshot_verify_repository_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_VERIFY_REPOSITORY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.verify_repository',
  connectorGroup: 'internal',
  summary: `Verify a snapshot repository`,
  description: `Verify a snapshot repository.

Check for common misconfigurations in a snapshot repository.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-verify-repository`,
  methods: ['POST'],
  patterns: ['_snapshot/{repository}/_verify'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-verify-repository',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository'],
    urlParams: ['master_timeout', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(snapshot_verify_repository_request, 'body'),
    ...getShapeAt(snapshot_verify_repository_request, 'path'),
    ...getShapeAt(snapshot_verify_repository_request, 'query'),
  }),
  outputSchema: snapshot_verify_repository_response,
};
