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
import { schema } from '@kbn/config-schema';
import type { AIAssistantManagementSelectionConfig } from './config';
import type {
  AIAssistantManagementSelectionPluginServerDependenciesSetup,
  AIAssistantManagementSelectionPluginServerDependenciesStart,
  AIAssistantManagementSelectionPluginServerSetup,
  AIAssistantManagementSelectionPluginServerStart,
} from './types';
import { AIAssistantType } from '../common/ai_assistant_type';
import { PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY } from '../common/ui_setting_keys';

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
        name: i18n.translate('aiAssistantManagementSelection.preferredAIAssistantTypeSettingName', {
          defaultMessage: 'Observability AI Assistant scope',
        }),
        category: [DEFAULT_APP_CATEGORIES.observability.id],
        value: this.config.preferredAIAssistantType,
        description: i18n.translate(
          'aiAssistantManagementSelection.preferredAIAssistantTypeSettingDescription',
          {
            defaultMessage:
              '<em>[technical preview]</em> Whether to show the Observability AI Assistant menu item in Observability, everywhere, or nowhere.',
            values: {
              em: (chunks) => `<em>${chunks}</em>`,
            },
          }
        ),
        schema: schema.oneOf(
          [
            schema.literal(AIAssistantType.Default),
            schema.literal(AIAssistantType.Observability),
            schema.literal(AIAssistantType.Never),
          ],
          { defaultValue: this.config.preferredAIAssistantType }
        ),
        options: [AIAssistantType.Default, AIAssistantType.Observability, AIAssistantType.Never],
        type: 'select',
        optionLabels: {
          [AIAssistantType.Default]: i18n.translate(
            'aiAssistantManagementSelection.preferredAIAssistantTypeSettingValueDefault',
            { defaultMessage: 'Observability only (default)' }
          ),
          [AIAssistantType.Observability]: i18n.translate(
            'aiAssistantManagementSelection.preferredAIAssistantTypeSettingValueObservability',
            { defaultMessage: 'Everywhere' }
          ),
          [AIAssistantType.Never]: i18n.translate(
            'aiAssistantManagementSelection.preferredAIAssistantTypeSettingValueNever',
            { defaultMessage: 'Nowhere' }
          ),
        },
        requiresPageReload: true,
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
