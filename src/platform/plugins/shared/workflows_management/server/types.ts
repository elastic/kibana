/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';

import { TaskManagerStartContract, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server/plugin';
import { WorkflowExecutionEngineModel } from '@kbn/workflows';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsPluginSetup {}

export interface WorkflowsPluginStart {
  runWorkflow(workflow: WorkflowExecutionEngineModel, params: Record<string, any>): Promise<string>;
}

export interface WorkflowsExecutionEnginePluginStartDeps {
  taskManager: TaskManagerStartContract;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  actions: ActionsPluginStartContract;
}

export interface WorkflowsManagementPluginServerDependenciesSetup {
  features?: FeaturesPluginSetup;
  taskManager?: TaskManagerSetupContract;
}
