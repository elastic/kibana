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
import { OBSERVABILITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY, PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY, SEARCH_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY, SECURITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY } from '../common/ui_setting_keys';
import { classicSetting } from './ui_settings/classic_setting';
import { observabilitySolutionSetting } from './ui_settings/observability_solution_setting';
import { securitySolutionSetting } from './ui_settings/security_solution_setting';
import { searchSolutionSetting } from './ui_settings/search_solution_setting';

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
        value: this.config.observabilitySolutionPreferredAIAssistantType,
      },
    });

    core.uiSettings.register({
      [SECURITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
        ...securitySolutionSetting,
        value: this.config.securitySolutionPreferredAIAssistantType,
      },
    });

    core.uiSettings.register({
      [SEARCH_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
        ...searchSolutionSetting,
        value: this.config.searchSolutionPreferredAIAssistantType,
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
