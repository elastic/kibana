/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { AIAssistantManagementPlugin } from './plugin';

import type {
  AIAssistantManagementSelectionPluginPublicSetup,
  AIAssistantManagementSelectionPluginPublicStart,
} from './plugin';

export { AIAssistantType } from '../common/ai_assistant_type';

export type {
  AIAssistantManagementSelectionPluginPublicSetup,
  AIAssistantManagementSelectionPluginPublicStart,
};

export const plugin: PluginInitializer<
  AIAssistantManagementSelectionPluginPublicSetup,
  AIAssistantManagementSelectionPluginPublicStart
> = (initializerContext: PluginInitializerContext) =>
  new AIAssistantManagementPlugin(initializerContext);
