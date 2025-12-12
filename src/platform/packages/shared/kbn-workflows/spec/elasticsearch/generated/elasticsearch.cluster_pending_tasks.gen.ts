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
 * Source: elasticsearch-specification repository, operations: cluster-pending-tasks
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  cluster_pending_tasks_request,
  cluster_pending_tasks_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CLUSTER_PENDING_TASKS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cluster.pending_tasks',
  summary: `Get the pending cluster tasks`,
  description: `Get the pending cluster tasks.

Get information about cluster-level changes (such as create index, update mapping, allocate or fail shard) that have not yet taken effect.

NOTE: This API returns a list of any pending updates to the cluster state.
These are distinct from the tasks reported by the task management API which include periodic tasks and tasks initiated by the user, such as node stats, search queries, or create index requests.
However, if a user-initiated task such as a create index command causes a cluster state update, the activity of this task might be reported by both task api and pending cluster tasks API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-pending-tasks`,
  methods: ['GET'],
  patterns: ['_cluster/pending_tasks'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-pending-tasks',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['local', 'master_timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cluster_pending_tasks_request, 'body'),
    ...getShapeAt(cluster_pending_tasks_request, 'path'),
    ...getShapeAt(cluster_pending_tasks_request, 'query'),
  }),
  outputSchema: cluster_pending_tasks_response,
};
