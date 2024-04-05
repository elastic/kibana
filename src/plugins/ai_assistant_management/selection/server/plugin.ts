/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  AIAssistantManagementSelectionPluginServerSetup,
  AIAssistantManagementSelectionPluginServerStart,
} from './types';
import { AIAssistantType } from '../common/ai_assistant_type';
import { PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY } from '../common/ui_setting_keys';

export class AIAssistantManagementSelectionPlugin
  implements
    Plugin<
      AIAssistantManagementSelectionPluginServerSetup,
      AIAssistantManagementSelectionPluginServerStart
    >
{
  private readonly config: AIAssistantManagementSelectionConfig;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get();
  }

  public setup(core: CoreSetup) {
    core.uiSettings.register({
      [PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY]: {
        name: i18n.translate('aiAssistantManagementSelection.preferredAIAssistantTypeSettingName', {
          defaultMessage: 'Observability AI Assistant scope',
        }),
        category: [DEFAULT_APP_CATEGORIES.observability.id],
        value: this.config.preferredAIAssistantType,
        description: i18n.translate(
          'aiAssistantManagementSelection.preferredAIAssistantTypeSettingDescription',
          { defaultMessage: 'Where the Observability AI Assistant is visible' }
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

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
