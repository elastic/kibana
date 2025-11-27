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
 * Generated at: 2025-11-27T07:04:28.189Z
 * Source: elasticsearch-specification repository, operations: ccr-forget-follower
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ccr_forget_follower_request, ccr_forget_follower_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CCR_FORGET_FOLLOWER_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ccr.forget_follower',
  connectorGroup: 'internal',
  summary: `Forget a follower`,
  description: `Forget a follower.

Remove the cross-cluster replication follower retention leases from the leader.

A following index takes out retention leases on its leader index.
These leases are used to increase the likelihood that the shards of the leader index retain the history of operations that the shards of the following index need to run replication.
When a follower index is converted to a regular index by the unfollow API (either by directly calling the API or by index lifecycle management tasks), these leases are removed.
However, removal of the leases can fail, for example when the remote cluster containing the leader index is unavailable.
While the leases will eventually expire on their own, their extended existence can cause the leader index to hold more history than necessary and prevent index lifecycle management from performing some operations on the leader index.
This API exists to enable manually removing the leases when the unfollow API is unable to do so.

NOTE: This API does not stop replication by a following index. If you use this API with a follower index that is still actively following, the following index will add back retention leases on the leader.
The only purpose of this API is to handle the case of failure to remove the following retention leases after the unfollow API is invoked.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-forget-follower`,
  methods: ['POST'],
  patterns: ['{index}/_ccr/forget_follower'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-forget-follower',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: ['timeout'],
    bodyParams: [
      'follower_cluster',
      'follower_index',
      'follower_index_uuid',
      'leader_remote_cluster',
    ],
  },
  paramsSchema: z.object({
    ...getShapeAt(ccr_forget_follower_request, 'body'),
    ...getShapeAt(ccr_forget_follower_request, 'path'),
    ...getShapeAt(ccr_forget_follower_request, 'query'),
  }),
  outputSchema: ccr_forget_follower_response,
};
