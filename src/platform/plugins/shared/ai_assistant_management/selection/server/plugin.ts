/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/server';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import type { AIAssistantManagementSelectionConfig } from './config';
import type {
  AIAssistantManagementSelectionPluginServerDependenciesSetup,
  AIAssistantManagementSelectionPluginServerDependenciesStart,
  AIAssistantManagementSelectionPluginServerSetup,
  AIAssistantManagementSelectionPluginServerStart,
} from './types';
import { AIAssistantType } from '../common/ai_assistant_type';
import {
  OBSERVABILITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  SEARCH_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  SECURITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
} from '../common/ui_setting_keys';
import { classicSetting } from './src/settings/classic_setting';
import { observabilitySolutionSetting } from './src/settings/observability_setting';
import { securitySolutionSetting } from './src/settings/security_setting';
import { searchSolutionSetting } from './src/settings/search_setting';

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
    core.uiSettings.register({
      [PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
        ...classicSetting,
        value: this.config.preferredAIAssistantType,
      },
    });

    core.uiSettings.register({
      [OBSERVABILITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
        ...observabilitySolutionSetting,
        value: AIAssistantType.Observability,
      },
    });

    core.uiSettings.register({
      [SECURITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
        ...securitySolutionSetting,
        value: AIAssistantType.Security,
      },
    });

    core.uiSettings.register({
      [SEARCH_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
        ...searchSolutionSetting,
        value: AIAssistantType.Observability,
      },
    });

    core.capabilities.registerProvider(() => {
      return {
        management: {
          kibana: {
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
        defaultMessage: 'AI Assistant',
      }),
      order: 8600,
      app: [],
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      management: {
        kibana: [
          'aiAssistantManagementSelection',
          'securityAiAssistantManagement',
          'observabilityAiAssistantManagement',
        ],
      },
      minimumLicense: 'enterprise',
      privileges: {
        all: {
          management: {
            kibana: [
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
            kibana: [
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

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
