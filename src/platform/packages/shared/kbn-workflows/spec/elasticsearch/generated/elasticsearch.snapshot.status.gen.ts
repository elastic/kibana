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
 * Source: elasticsearch-specification repository, operations: snapshot-status, snapshot-status-1, snapshot-status-2
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  snapshot_status1_request,
  snapshot_status1_response,
  snapshot_status2_request,
  snapshot_status2_response,
  snapshot_status_request,
  snapshot_status_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SNAPSHOT_STATUS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.snapshot.status',
  summary: `Get the snapshot status`,
  description: `Get the snapshot status.

Get a detailed description of the current state for each shard participating in the snapshot.

Note that this API should be used only to obtain detailed shard-level information for ongoing snapshots.
If this detail is not needed or you want to obtain information about one or more existing snapshots, use the get snapshot API.

If you omit the \`<snapshot>\` request path parameter, the request retrieves information only for currently running snapshots.
This usage is preferred.
If needed, you can specify \`<repository>\` and \`<snapshot>\` to retrieve information for specific snapshots, even if they're not currently running.

Note that the stats will not be available for any shard snapshots in an ongoing snapshot completed by a node that (even momentarily) left the cluster.
Loading the stats from the repository is an expensive operation (see the WARNING below).
Therefore the stats values for such shards will be -1 even though the "stage" value will be "DONE", in order to minimize latency.
A "description" field will be present for a shard snapshot completed by a departed node explaining why the shard snapshot's stats results are invalid.
Consequently, the total stats for the index will be less than expected due to the missing values from these shards.

WARNING: Using the API to return the status of any snapshots other than currently running snapshots can be expensive.
The API requires a read from the repository for each shard in each snapshot.
For example, if you have 100 snapshots with 1,000 shards each, an API request that includes all snapshots will require 100,000 reads (100 snapshots x 1,000 shards).

Depending on the latency of your storage, such requests can take an extremely long time to return results.
These requests can also tax machine resources and, when using cloud storage, incur high processing costs.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-status`,
  methods: ['GET'],
  patterns: [
    '_snapshot/_status',
    '_snapshot/{repository}/_status',
    '_snapshot/{repository}/{snapshot}/_status',
  ],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-status',
  parameterTypes: {
    headerParams: [],
    pathParams: ['repository', 'snapshot'],
    urlParams: ['ignore_unavailable', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(snapshot_status_request, 'body'),
      ...getShapeAt(snapshot_status_request, 'path'),
      ...getShapeAt(snapshot_status_request, 'query'),
    }),
    z.object({
      ...getShapeAt(snapshot_status1_request, 'body'),
      ...getShapeAt(snapshot_status1_request, 'path'),
      ...getShapeAt(snapshot_status1_request, 'query'),
    }),
    z.object({
      ...getShapeAt(snapshot_status2_request, 'body'),
      ...getShapeAt(snapshot_status2_request, 'path'),
      ...getShapeAt(snapshot_status2_request, 'query'),
    }),
  ]),
  outputSchema: z.union([
    snapshot_status_response,
    snapshot_status1_response,
    snapshot_status2_response,
  ]),
};
