/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { AIAssistantManagementSelectionConfig } from './config';
import type {
  AIAssistantManagementSelectionPluginServerDependenciesSetup,
  AIAssistantManagementSelectionPluginServerDependenciesStart,
  AIAssistantManagementSelectionPluginServerSetup,
  AIAssistantManagementSelectionPluginServerStart,
} from './types';
import { PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY } from '../common/ui_setting_keys';
import { classicSetting } from './src/settings/classic_setting';
import { AIAssistantType } from '../common/ai_assistant_type';

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

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get();
  }

  public setup(
    core: CoreSetup,
    plugins: AIAssistantManagementSelectionPluginServerDependenciesSetup
  ) {
    core.capabilities.registerProvider(() => {
      return {
        management: {
          ai: {
            aiAssistantManagementSelection: true,
            observabilityAiAssistantManagement: true,
            securityAiAssistantManagement: true,
          },
        },
      };
    });

    plugins.features?.registerKibanaFeature({
      id: 'aiAssistantManagementSelection',
      name: i18n.translate('aiAssistantManagementSelection.featureRegistry.featureName', {
        defaultMessage: 'AI Assistant Settings',
      }),
      order: 8600,
      app: [],
      category: DEFAULT_APP_CATEGORIES.management,
      management: {
        ai: [
          'aiAssistantManagementSelection',
          'securityAiAssistantManagement',
          'observabilityAiAssistantManagement',
        ],
      },
      minimumLicense: 'enterprise',
      privileges: {
        all: {
          management: {
            ai: [
              'aiAssistantManagementSelection',
              'securityAiAssistantManagement',
              'observabilityAiAssistantManagement',
            ],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          management: {
            ai: [
              'aiAssistantManagementSelection',
              'securityAiAssistantManagement',
              'observabilityAiAssistantManagement',
            ],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });

    this.registerUiSettings(core, plugins);

    return {};
  }

  private registerUiSettings(
    core: CoreSetup,
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
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
