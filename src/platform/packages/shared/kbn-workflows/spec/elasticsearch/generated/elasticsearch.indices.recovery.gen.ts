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
 * Generated at: 2025-11-27T07:04:28.224Z
 * Source: elasticsearch-specification repository, operations: indices-recovery, indices-recovery-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  indices_recovery1_request,
  indices_recovery1_response,
  indices_recovery_request,
  indices_recovery_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const INDICES_RECOVERY_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.indices.recovery',
  connectorGroup: 'internal',
  summary: `Get index recovery information`,
  description: `Get index recovery information.

Get information about ongoing and completed shard recoveries for one or more indices.
For data streams, the API returns information for the stream's backing indices.

All recoveries, whether ongoing or complete, are kept in the cluster state and may be reported on at any time.

Shard recovery is the process of initializing a shard copy, such as restoring a primary shard from a snapshot or creating a replica shard from a primary shard.
When a shard recovery completes, the recovered shard is available for search and indexing.

Recovery automatically occurs during the following processes:

* When creating an index for the first time.
* When a node rejoins the cluster and starts up any missing primary shard copies using the data that it holds in its data path.
* Creation of new replica shard copies from the primary.
* Relocation of a shard copy to a different node in the same cluster.
* A snapshot restore operation.
* A clone, shrink, or split operation.

You can determine the cause of a shard recovery using the recovery or cat recovery APIs.

The index recovery API reports information about completed recoveries only for shard copies that currently exist in the cluster.
It only reports the last recovery for each shard copy and does not report historical information about earlier recoveries, nor does it report information about the recoveries of shard copies that no longer exist.
This means that if a shard copy completes a recovery and then Elasticsearch relocates it onto a different node then the information about the original recovery will not be shown in the recovery API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-recovery`,
  methods: ['GET'],
  patterns: ['_recovery', '{index}/_recovery'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-recovery',
  parameterTypes: {
    headerParams: [],
    pathParams: ['index'],
    urlParams: [
      'active_only',
      'detailed',
      'allow_no_indices',
      'expand_wildcards',
      'ignore_unavailable',
    ],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(indices_recovery_request, 'body'),
      ...getShapeAt(indices_recovery_request, 'path'),
      ...getShapeAt(indices_recovery_request, 'query'),
    }),
    z.object({
      ...getShapeAt(indices_recovery1_request, 'body'),
      ...getShapeAt(indices_recovery1_request, 'path'),
      ...getShapeAt(indices_recovery1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([indices_recovery_response, indices_recovery1_response]),
};
