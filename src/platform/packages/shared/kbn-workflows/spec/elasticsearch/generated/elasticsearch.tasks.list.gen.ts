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
 * Generated at: 2025-11-27T07:04:28.258Z
 * Source: elasticsearch-specification repository, operations: tasks-list
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { tasks_list_request, tasks_list_response } from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TASKS_LIST_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.tasks.list',
  connectorGroup: 'internal',
  summary: `Get all tasks`,
  description: `Get all tasks.

Get information about the tasks currently running on one or more nodes in the cluster.

WARNING: The task management API is new and should still be considered a beta feature.
The API may change in ways that are not backwards compatible.

**Identifying running tasks**

The \`X-Opaque-Id header\`, when provided on the HTTP request header, is going to be returned as a header in the response as well as in the headers field for in the task information.
This enables you to track certain calls or associate certain tasks with the client that started them.
For example:

\`\`\`
curl -i -H "X-Opaque-Id: 123456" "http://localhost:9200/_tasks?group_by=parents"
\`\`\`

The API returns the following result:

\`\`\`
HTTP/1.1 200 OK
X-Opaque-Id: 123456
content-type: application/json; charset=UTF-8
content-length: 831

{
  "tasks" : {
    "u5lcZHqcQhu-rUoFaqDphA:45" : {
      "node" : "u5lcZHqcQhu-rUoFaqDphA",
      "id" : 45,
      "type" : "transport",
      "action" : "cluster:monitor/tasks/lists",
      "start_time_in_millis" : 1513823752749,
      "running_time_in_nanos" : 293139,
      "cancellable" : false,
      "headers" : {
        "X-Opaque-Id" : "123456"
      },
      "children" : [
        {
          "node" : "u5lcZHqcQhu-rUoFaqDphA",
          "id" : 46,
          "type" : "direct",
          "action" : "cluster:monitor/tasks/lists[n]",
          "start_time_in_millis" : 1513823752750,
          "running_time_in_nanos" : 92133,
          "cancellable" : false,
          "parent_task_id" : "u5lcZHqcQhu-rUoFaqDphA:45",
          "headers" : {
            "X-Opaque-Id" : "123456"
          }
        }
      ]
    }
  }
 }
\`\`\`
In this example, \`X-Opaque-Id: 123456\` is the ID as a part of the response header.
The \`X-Opaque-Id\` in the task \`headers\` is the ID for the task that was initiated by the REST request.
The \`X-Opaque-Id\` in the children \`headers\` is the child task of the task that was initiated by the REST request.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks`,
  methods: ['GET'],
  patterns: ['_tasks'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/group/endpoint-tasks',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'actions',
      'detailed',
      'group_by',
      'nodes',
      'parent_task_id',
      'timeout',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(tasks_list_request, 'body'),
    ...getShapeAt(tasks_list_request, 'path'),
    ...getShapeAt(tasks_list_request, 'query'),
  }),
  outputSchema: tasks_list_response,
};
