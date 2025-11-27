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
 * Source: /oas_docs/output/kibana.yaml, operations: task-manager-health
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';
import type { InternalConnectorContract } from '../../../types/latest';

import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import {
  task_manager_health_request,
  task_manager_health_response,
} from './schemas/kibana_openapi_zod.gen';
import { FetcherConfigSchema } from '../../schema';

// export contract
export const TASK_MANAGER_HEALTH_CONTRACT: InternalConnectorContract = {
  type: 'kibana.task_manager_health',
  connectorGroup: 'internal',
  summary: `Get the task manager health`,
  description: `Get the health status of the Kibana task manager.
`,
  methods: ['GET'],
  patterns: ['/api/task_manager/_health'],
  documentation: null,
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(task_manager_health_request, 'body'),
    ...getShapeAt(task_manager_health_request, 'path'),
    ...getShapeAt(task_manager_health_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: task_manager_health_response,
};
