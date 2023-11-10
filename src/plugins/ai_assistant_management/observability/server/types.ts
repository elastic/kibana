/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  PluginSetupContract as ActionsPluginSetup,
  PluginStartContract as ActionsPluginStart,
} from '@kbn/actions-plugin/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import type {
  PluginStartContract as FeaturesPluginStart,
  PluginSetupContract as FeaturesPluginSetup,
} from '@kbn/features-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

export interface AiAssistantManagementObservabilityPluginSetup {
  taskManager: TaskManagerSetupContract;
}

export interface AiAssistantManagementObservabilityPluginStart {
  taskManager: TaskManagerSetupContract;
}

export interface AiAssistantManagementObservabilityPluginSetupDependencies {
  actions: ActionsPluginSetup;
  security: SecurityPluginSetup;
  features: FeaturesPluginSetup;
  taskManager: TaskManagerSetupContract;
}

export interface AiAssistantManagementObservabilityPluginStartDependencies {
  actions: ActionsPluginStart;
  security: SecurityPluginStart;
  features: FeaturesPluginStart;
  taskManager: TaskManagerStartContract;
  dataViews: DataViewsServerPluginStart;
}
