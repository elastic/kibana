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
 * Generated at: 2025-11-27T07:43:24.859Z
 * Source: elasticsearch-specification repository, operations: ccr-unfollow
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ccr_unfollow_request, ccr_unfollow_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CCR_UNFOLLOW_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.unfollow',
  connectorGroup: 'internal',
  summary: `Unfollow an index`,
  description: `Unfollow an index.

Convert a cross-cluster replication follower index to a regular index.
The API stops the following task associated with a follower index and removes index metadata and settings associated with cross-cluster replication.
The follower index must be paused and closed before you call the unfollow API.

> info
> Currently cross-cluster replication does not support converting an existing regular index to a follower index. Converting a follower index to a regular index is an irreversible operation.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-unfollow`,
  methods: ['POST'],
  patterns: ['{index}/_ccr/unfollow'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-unfollow',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ccr_unfollow_request, 'body'),
    ...getShapeAt(ccr_unfollow_request, 'path'),
    ...getShapeAt(ccr_unfollow_request, 'query'),
  }),
  outputSchema: ccr_unfollow_response,
};
