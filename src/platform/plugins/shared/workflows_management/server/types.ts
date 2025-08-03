/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';

import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server/plugin';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { WorkflowExecutionEngineModel } from '@kbn/workflows';
import { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { WorkflowsManagementApi } from './workflows_management/workflows_management_api';

export interface WorkflowsPluginSetup {
  management: WorkflowsManagementApi;
}

export interface WorkflowsPluginStart {
  runWorkflow(workflow: WorkflowExecutionEngineModel, params: Record<string, any>): Promise<string>;
}

export interface WorkflowsExecutionEnginePluginStartDeps {
  taskManager: TaskManagerStartContract;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  actions: ActionsPluginStartContract;
  security?: SecurityPluginStart;
}

export interface WorkflowsManagementPluginServerDependenciesSetup {
  features?: FeaturesPluginSetup;
  taskManager?: TaskManagerSetupContract;
  actions?: ActionsPluginSetupContract;
  alerting?: AlertingServerSetup;
}
