/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { AIAssistantManagementSelectionConfig } from './config';
import type {
  AIAssistantManagementSelectionPluginServerDependenciesSetup,
  AIAssistantManagementSelectionPluginServerDependenciesStart,
  AIAssistantManagementSelectionPluginServerSetup,
  AIAssistantManagementSelectionPluginServerStart,
} from './types';
import {
  PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  PREFERRED_CHAT_EXPERIENCE_SETTING_KEY,
} from '../common/ui_setting_keys';
import { classicSetting } from './src/settings/classic_setting';
import { AIAssistantType } from '../common/ai_assistant_type';
import { chatExperienceSetting } from './src/settings/chat_experience_setting';

export class AIAssistantManagementSelectionPlugin
  implements
    Plugin<
      AIAssistantManagementSelectionPluginServerSetup,
      AIAssistantManagementSelectionPluginServerStart,
      AIAssistantManagementSelectionPluginServerDependenciesSetup,
      AIAssistantManagementSelectionPluginServerDependenciesStart
    >
{
  private readonly config: AIAssistantManagementSelectionConfig;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get();
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<
      AIAssistantManagementSelectionPluginServerDependenciesStart,
      AIAssistantManagementSelectionPluginServerStart
    >,
    plugins: AIAssistantManagementSelectionPluginServerDependenciesSetup
  ) {
    this.registerUiSettings(core, plugins);

    return {};
  }

  private registerUiSettings(
    core: CoreSetup<
      AIAssistantManagementSelectionPluginServerDependenciesStart,
      AIAssistantManagementSelectionPluginServerStart
    >,
    plugins: AIAssistantManagementSelectionPluginServerDependenciesSetup
  ) {
    const { cloud } = plugins;
    const serverlessProjectType = cloud?.serverless.projectType;

    // Do not register the setting in a serverless project
    if (!serverlessProjectType) {
      core.uiSettings.register({
        [PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
          ...classicSetting,
          value: this.config.preferredAIAssistantType ?? AIAssistantType.Default,
        },
      });
    }

    // Register chat experience setting for both stateful and serverless (except workplaceai)
    if (serverlessProjectType !== 'workplaceai') {
      // Default Agent for Elasticsearch solution view, Classic for all other cases
      core.uiSettings.register({
        [PREFERRED_CHAT_EXPERIENCE_SETTING_KEY]: {
          ...chatExperienceSetting,
          getValue: async ({ request }: { request?: KibanaRequest } = {}) => {
            try {
              const [, startServices] = await core.getStartServices();
              // Avoid security exceptions before login - only check space when authenticated
              if (startServices.spaces && request?.auth.isAuthenticated) {
                const activeSpace = await startServices.spaces.spacesService.getActiveSpace(
                  request
                );
                if (activeSpace?.solution === 'es') {
                  return AIChatExperience.Agent;
                }
              }
            } catch (e) {
              this.logger.error('Error getting active space:');
              this.logger.error(e);
            }
            return this.config.preferredChatExperience ?? AIChatExperience.Classic;
          },
        },
      });
    }
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
