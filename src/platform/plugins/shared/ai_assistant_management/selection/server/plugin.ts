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

import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { schema } from '@kbn/config-schema';
import type { AIAssistantManagementSelectionConfig } from './config';
import type {
  AIAssistantManagementSelectionPluginServerDependenciesSetup,
  AIAssistantManagementSelectionPluginServerDependenciesStart,
  AIAssistantManagementSelectionPluginServerSetup,
  AIAssistantManagementSelectionPluginServerStart,
} from './types';
import { PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY } from '../common/ui_setting_keys';
import { NO_DEFAULT_CONNECTOR } from '../common/constants';
import { classicSetting } from './src/settings/classic_setting';
import { observabilitySolutionSetting } from './src/settings/observability_setting';
import { securitySolutionSetting } from './src/settings/security_setting';
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
    plugins.features?.registerKibanaFeature({
      id: 'aiAssistantManagementSelection',
      name: i18n.translate('aiAssistantManagementSelection.featureRegistry.featureName', {
        defaultMessage: 'AI Assistant',
      }),
      order: 8600,
      app: [],
      category: DEFAULT_APP_CATEGORIES.management,
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

    this.registerUiSettings(core, plugins);

    return {};
  }

  private registerUiSettings(
    core: CoreSetup,
    plugins: AIAssistantManagementSelectionPluginServerDependenciesSetup
  ) {
    core.uiSettings.register({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR]: {
        readonlyMode: 'ui',
        readonly: true,
        schema: schema.string(),
        value: NO_DEFAULT_CONNECTOR,
      },
    });

    core.uiSettings.register({
      [GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY]: {
        readonlyMode: 'ui',
        readonly: true,
        schema: schema.boolean(),
        value: false,
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

    const { cloud } = plugins;
    const serverlessProjectType = cloud?.serverless.projectType;

    switch (serverlessProjectType) {
      case 'observability':
        core.uiSettings.register({
          [PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
            ...observabilitySolutionSetting,
            value: this.config.preferredAIAssistantType,
          },
        });
        return;
      case 'security':
        core.uiSettings.register({
          [PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
            ...securitySolutionSetting,
            value: this.config.preferredAIAssistantType,
          },
        });
        return;
      // TODO: Add another case for search with the correct copy of the setting.
      // see: https://github.com/elastic/kibana/issues/227695
      default:
        // This case is hit when in stateful Kibana
        return core.uiSettings.register({
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
