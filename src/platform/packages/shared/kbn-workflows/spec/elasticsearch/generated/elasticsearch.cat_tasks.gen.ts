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
 * Source: elasticsearch-specification repository, operations: cat-tasks
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import { cat_tasks_request, cat_tasks_response } from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const CAT_TASKS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.cat.tasks',
  summary: `Get task information`,
  description: `Get task information.

Get information about tasks currently running in the cluster.
IMPORTANT: cat APIs are only intended for human consumption using the command line or Kibana console. They are not intended for use by applications. For application consumption, use the task management API.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-tasks`,
  methods: ['GET'],
  patterns: ['_cat/tasks'],
  documentation: 'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-tasks',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [
      'actions',
      'detailed',
      'nodes',
      'parent_task_id',
      'h',
      's',
      'timeout',
      'wait_for_completion',
    ],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(cat_tasks_request, 'body'),
    ...getShapeAt(cat_tasks_request, 'path'),
    ...getShapeAt(cat_tasks_request, 'query'),
  }),
  outputSchema: cat_tasks_response,
};
