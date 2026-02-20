/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';

// Import all route registration functions
import { registerDeleteWorkflowByIdRoute } from './delete_workflow_by_id';
import { registerDeleteWorkflowsBulkRoute } from './delete_workflows_bulk';
import { registerGetConnectorsRoute } from './get_connectors';
import { registerGetStepExecutionRoute } from './get_step_execution';
import { registerGetWorkflowAggsRoute } from './get_workflow_aggs';
import { registerGetWorkflowByIdRoute } from './get_workflow_by_id';
import { registerGetWorkflowExecutionByIdRoute } from './get_workflow_execution_by_id';
import { registerGetWorkflowExecutionLogsRoute } from './get_workflow_execution_logs';
import { registerGetWorkflowExecutionsRoute } from './get_workflow_executions';
import { registerGetWorkflowJsonSchemaRoute } from './get_workflow_json_schema';
import { registerGetWorkflowStatsRoute } from './get_workflow_stats';
import { registerPostBulkCreateWorkflowsRoute } from './post_bulk_create_workflows';
import { registerPostCancelWorkflowExecutionRoute } from './post_cancel_workflow_execution';
import { registerPostCloneWorkflowRoute } from './post_clone_workflow';
import { registerPostCreateWorkflowRoute } from './post_create_workflow';
import { registerPostRunWorkflowRoute } from './post_run_workflow';
import { registerPostSearchWorkflowsRoute } from './post_search_workflows';
import { registerPostTestStepRoute } from './post_test_step';
import { registerPostTestWorkflowRoute } from './post_test_workflow';
import { registerPutUpdateWorkflowRoute } from './put_update_workflow';
import type { RouteDependencies } from './types';
import type { WorkflowsRouter } from '../../types';
import type { WorkflowsManagementApi } from '../workflows_management_api';

export function defineRoutes(
  router: WorkflowsRouter,
  api: WorkflowsManagementApi,
  logger: Logger,
  spaces: SpacesServiceStart
) {
  const deps: RouteDependencies = { router, api, logger, spaces };

  // Register all routes
  registerGetWorkflowStatsRoute(deps);
  registerGetWorkflowAggsRoute(deps);
  registerGetWorkflowByIdRoute(deps);
  registerGetConnectorsRoute(deps);
  registerPostSearchWorkflowsRoute(deps);
  registerPostCreateWorkflowRoute(deps);
  registerPostBulkCreateWorkflowsRoute(deps);
  registerPutUpdateWorkflowRoute(deps);
  registerDeleteWorkflowByIdRoute(deps);
  registerDeleteWorkflowsBulkRoute(deps);
  registerPostRunWorkflowRoute(deps);
  registerPostCloneWorkflowRoute(deps);
  registerPostTestWorkflowRoute(deps);
  registerPostTestStepRoute(deps);
  registerGetWorkflowExecutionsRoute(deps);
  registerGetWorkflowExecutionByIdRoute(deps);
  registerPostCancelWorkflowExecutionRoute(deps);
  registerGetWorkflowExecutionLogsRoute(deps);
  registerGetStepExecutionRoute(deps);
  registerGetWorkflowJsonSchemaRoute(deps);
}
