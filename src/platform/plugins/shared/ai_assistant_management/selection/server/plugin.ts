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
import { BuildFlavor } from '@kbn/config';
import type { AIAssistantManagementSelectionConfig } from './config';
import type {
  AIAssistantManagementSelectionPluginServerDependenciesSetup,
  AIAssistantManagementSelectionPluginServerDependenciesStart,
  AIAssistantManagementSelectionPluginServerSetup,
  AIAssistantManagementSelectionPluginServerStart,
} from './types';
import { AIAssistantType } from '../common/ai_assistant_type';
import {
  PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
} from '../common/ui_setting_keys';
import { classicSetting } from './src/settings/classic_setting';
import { observabilitySolutionSetting } from './src/settings/observability_setting';
import { securitySolutionSetting } from './src/settings/security_setting';

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
  private readonly buildFlavor: BuildFlavor;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get();
    this.buildFlavor = initializerContext.env.packageInfo.buildFlavor;
  }

  public setup(
    core: CoreSetup,
    plugins: AIAssistantManagementSelectionPluginServerDependenciesSetup
  ) {
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

    if (this.buildFlavor === 'serverless') {
      const { cloud } = plugins;
      const solution = cloud?.serverless.projectType;

      switch (solution) {
        case 'observability':
          core.uiSettings.register({
            [PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
              ...observabilitySolutionSetting,
              value: AIAssistantType.Observability,
            },
          });
          break;
        case 'security':
          core.uiSettings.register({
            [PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
              ...securitySolutionSetting,
              value: AIAssistantType.Security,
            },
          });
          break;
        default:
          break;
      }
    } else {
      core.uiSettings.register({
        [PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
          ...classicSetting,
          value: this.config.preferredAIAssistantType,
        },
      });
    }

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() { }
}
