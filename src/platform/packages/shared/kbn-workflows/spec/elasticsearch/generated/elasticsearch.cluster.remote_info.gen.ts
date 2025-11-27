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
 * Generated at: 2025-11-27T07:04:28.197Z
 * Source: elasticsearch-specification repository, operations: cluster-remote-info
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cluster_remote_info_request, cluster_remote_info_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_REMOTE_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.remote_info',
  connectorGroup: 'internal',
  summary: `Get remote cluster information`,
  description: `Get remote cluster information.

Get information about configured remote clusters.
The API returns connection and endpoint information keyed by the configured remote cluster alias.

> info
> This API returns information that reflects current state on the local cluster.
> The \`connected\` field does not necessarily reflect whether a remote cluster is down or unavailable, only whether there is currently an open connection to it.
> Elasticsearch does not spontaneously try to reconnect to a disconnected remote cluster.
> To trigger a reconnection, attempt a cross-cluster search, ES|QL cross-cluster search, or try the [resolve cluster endpoint](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-resolve-cluster).

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-remote-info`,
  methods: ['GET'],
  patterns: ['_remote/info'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-remote-info',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cluster_remote_info_request, 'body'),
    ...getShapeAt(cluster_remote_info_request, 'path'),
    ...getShapeAt(cluster_remote_info_request, 'query'),
  }),
  outputSchema: cluster_remote_info_response,
};
