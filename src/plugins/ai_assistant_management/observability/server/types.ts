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
import type {
  PluginStartContract as FeaturesPluginStart,
  PluginSetupContract as FeaturesPluginSetup,
} from '@kbn/features-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type {
  ObservabilityAIAssistantPluginSetup,
  ObservabilityAIAssistantPluginStart,
} from '@kbn/observability-ai-assistant-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAssistantManagementObservabilityPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AiAssistantManagementObservabilityPluginStart {}

export interface AiAssistantManagementObservabilityPluginSetupDependencies {
  actions?: ActionsPluginSetup;
  features?: FeaturesPluginSetup;
  observabilityAIAssistant?: ObservabilityAIAssistantPluginSetup;
  security: SecurityPluginSetup;
}

export interface AiAssistantManagementObservabilityPluginStartDependencies {
  actions?: ActionsPluginStart;
  features?: FeaturesPluginStart;
  observabilityAIAssistant?: ObservabilityAIAssistantPluginStart;
  security: SecurityPluginStart;
}
