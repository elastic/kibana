/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerBulkCreateWorkflowsRoute } from './bulk_create_workflows';
import { registerBulkDeleteWorkflowsRoute } from './bulk_delete_workflows';
import { registerCloneWorkflowRoute } from './clone_workflow';
import { registerCreateWorkflowRoute } from './create_workflow';
import { registerDeleteWorkflowRoute } from './delete_workflow';
import { registerExportWorkflowsRoute } from './export_workflows';
import { registerGetAggsRoute } from './get_aggs';
import { registerGetConnectorsRoute } from './get_connectors';
import { registerGetSchemaRoute } from './get_schema';
import { registerGetStatsRoute } from './get_stats';
import { registerGetWorkflowRoute } from './get_workflow';
import { registerGetWorkflowsRoute } from './get_workflows';
import { registerMgetWorkflowsRoute } from './mget_workflows';
import { registerUpdateWorkflowRoute } from './update_workflow';
import { registerValidateWorkflowRoute } from './validate_workflow';
import type { RouteDependencies } from '../types';

export function registerWorkflowRoutes(deps: RouteDependencies) {
  registerGetWorkflowsRoute(deps);
  registerBulkCreateWorkflowsRoute(deps);
  registerBulkDeleteWorkflowsRoute(deps);
  registerMgetWorkflowsRoute(deps);
  registerGetStatsRoute(deps);
  registerGetAggsRoute(deps);
  registerGetConnectorsRoute(deps);
  registerGetSchemaRoute(deps);
  registerValidateWorkflowRoute(deps);
  registerExportWorkflowsRoute(deps);
  registerCreateWorkflowRoute(deps);
  registerGetWorkflowRoute(deps);
  registerUpdateWorkflowRoute(deps);
  registerDeleteWorkflowRoute(deps);
  registerCloneWorkflowRoute(deps);
}
