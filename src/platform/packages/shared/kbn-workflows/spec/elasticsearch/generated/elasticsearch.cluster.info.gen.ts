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
 * Generated at: 2025-11-27T07:43:24.861Z
 * Source: elasticsearch-specification repository, operations: cluster-info
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cluster_info_request, cluster_info_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_INFO_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.info',
  connectorGroup: 'internal',
  summary: `Get cluster info`,
  description: `Get cluster info.

Returns basic information about the cluster.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-info`,
  methods: ['GET'],
  patterns: ['_info/{target}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-info',
  parameterTypes: {
    headerParams: [],
    pathParams: ['target'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cluster_info_request, 'body'),
    ...getShapeAt(cluster_info_request, 'path'),
    ...getShapeAt(cluster_info_request, 'query'),
  }),
  outputSchema: cluster_info_response,
};
