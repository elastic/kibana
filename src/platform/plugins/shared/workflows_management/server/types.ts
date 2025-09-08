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

import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server/plugin';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsManagementApi } from './workflows_management/workflows_management_api';

export interface WorkflowsPluginSetup {
  management: WorkflowsManagementApi;
}

export type WorkflowsPluginStart = Record<string, never>;

export interface WorkflowsExecutionEnginePluginStartDeps {
  taskManager: TaskManagerStartContract;
  workflowsExecutionEngine: WorkflowsExecutionEnginePluginStart;
  actions: ActionsPluginStartContract;
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

export interface WorkflowsManagementPluginServerDependenciesSetup {
  features?: FeaturesPluginSetup;
  taskManager?: TaskManagerSetupContract;
  actions?: ActionsPluginSetupContract;
  alerting?: AlertingServerSetup;
  spaces?: SpacesPluginStart;
}
