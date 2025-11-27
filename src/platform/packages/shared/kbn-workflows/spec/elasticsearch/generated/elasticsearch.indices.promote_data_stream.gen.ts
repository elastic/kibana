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
 * Generated at: 2025-11-27T07:04:28.223Z
 * Source: elasticsearch-specification repository, operations: indices-promote-data-stream
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_promote_data_stream_request,
  indices_promote_data_stream_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_PROMOTE_DATA_STREAM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.promote_data_stream',
  connectorGroup: 'internal',
  summary: `Promote a data stream`,
  description: `Promote a data stream.

Promote a data stream from a replicated data stream managed by cross-cluster replication (CCR) to a regular data stream.

With CCR auto following, a data stream from a remote cluster can be replicated to the local cluster.
These data streams can't be rolled over in the local cluster.
These replicated data streams roll over only if the upstream data stream rolls over.
In the event that the remote cluster is no longer available, the data stream in the local cluster can be promoted to a regular data stream, which allows these data streams to be rolled over in the local cluster.

NOTE: When promoting a data stream, ensure the local cluster has a data stream enabled index template that matches the data stream.
If this is missing, the data stream will not be able to roll over until a matching index template is created.
This will affect the lifecycle management of the data stream and interfere with the data stream size and retention.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-promote-data-stream`,
  methods: ['POST'],
  patterns: ['_data_stream/_promote/{name}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-promote-data-stream',
  parameterTypes: {
    headerParams: [],
    pathParams: ['name'],
    urlParams: ['master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(indices_promote_data_stream_request, 'body'),
    ...getShapeAt(indices_promote_data_stream_request, 'path'),
    ...getShapeAt(indices_promote_data_stream_request, 'query'),
  }),
  outputSchema: indices_promote_data_stream_response,
};
