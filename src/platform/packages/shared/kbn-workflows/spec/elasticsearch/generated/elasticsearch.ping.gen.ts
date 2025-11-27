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
 * Generated at: 2025-11-27T07:04:28.242Z
 * Source: elasticsearch-specification repository, operations: ping
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { ping_request, ping_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const PING_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ping',
  connectorGroup: 'internal',
  summary: `Ping the cluster`,
  description: `Ping the cluster.

Get information about whether the cluster is running.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-cluster`,
  methods: ['HEAD'],
  patterns: [''],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-cluster',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(ping_request, 'body'),
    ...getShapeAt(ping_request, 'path'),
    ...getShapeAt(ping_request, 'query'),
  }),
  outputSchema: ping_response,
};
