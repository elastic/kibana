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
 * Source: elasticsearch-specification repository, operations: tasks-cancel, tasks-cancel-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  tasks_cancel1_request,
  tasks_cancel1_response,
  tasks_cancel_request,
  tasks_cancel_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TASKS_CANCEL_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.tasks.cancel',
  connectorGroup: 'internal',
  summary: `Cancel a task`,
  description: `Cancel a task.

WARNING: The task management API is new and should still be considered a beta feature.
The API may change in ways that are not backwards compatible.

A task may continue to run for some time after it has been cancelled because it may not be able to safely stop its current activity straight away.
It is also possible that Elasticsearch must complete its work on other tasks before it can process the cancellation.
The get task information API will continue to list these cancelled tasks until they complete.
The cancelled flag in the response indicates that the cancellation command has been processed and the task will stop as soon as possible.

To troubleshoot why a cancelled task does not complete promptly, use the get task information API with the \`?detailed\` parameter to identify the other tasks the system is running.
You can also use the node hot threads API to obtain detailed information about the work the system is doing instead of completing the cancelled task.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks`,
  methods: ['POST'],
  patterns: ['_tasks/_cancel', '_tasks/{task_id}/_cancel'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks',
  parameterTypes: {
    headerParams: [],
    pathParams: ['task_id'],
    urlParams: ['actions', 'nodes', 'parent_task_id', 'wait_for_completion'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(tasks_cancel_request, 'body'),
      ...getShapeAt(tasks_cancel_request, 'path'),
      ...getShapeAt(tasks_cancel_request, 'query'),
    }),
    z.object({
      ...getShapeAt(tasks_cancel1_request, 'body'),
      ...getShapeAt(tasks_cancel1_request, 'path'),
      ...getShapeAt(tasks_cancel1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([tasks_cancel_response, tasks_cancel1_response]),
};
