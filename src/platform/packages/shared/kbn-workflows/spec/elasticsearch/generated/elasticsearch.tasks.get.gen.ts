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
 * Generated at: 2025-11-27T07:43:24.923Z
 * Source: elasticsearch-specification repository, operations: tasks-get
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { tasks_get_request, tasks_get_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TASKS_GET_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.tasks.get',
  connectorGroup: 'internal',
  summary: `Get task information`,
  description: `Get task information.

Get information about a task currently running in the cluster.

WARNING: The task management API is new and should still be considered a beta feature.
The API may change in ways that are not backwards compatible.

If the task identifier is not found, a 404 response code indicates that there are no resources that match the request.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks`,
  methods: ['GET'],
  patterns: ['_tasks/{task_id}'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_id'],
    urlParams: ['timeout', 'wait_for_completion'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(tasks_get_request, 'body'),
    ...getShapeAt(tasks_get_request, 'path'),
    ...getShapeAt(tasks_get_request, 'query'),
  }),
  outputSchema: tasks_get_response,
};
