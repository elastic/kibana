/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { AIAssistantType } from '../../../common/ai_assistant_type';
import { HIDE_ASSISTANT, SHOW_SEARCH } from './translations';

// Define the classicSetting with proper typing
export const searchSolutionSetting: Omit<
  UiSettingsParams<AIAssistantType.Never | AIAssistantType.Observability>,
  'value'
> = {
  name: i18n.translate(
    'aiAssistantManagementSelection.searchSolutionSetting.preferredAIAssistantTypeSettingName',
    {
      defaultMessage: 'AI Assistant visibility',
    }
  ),
  description: i18n.translate(
    'aiAssistantManagementSelection.searchSolutionSetting.preferredAIAssistantTypeSettingDescription',
    {
      defaultMessage:
        'Choose if the Search AI Assistant is available. Show the Search AI Assistant, or hide the Assistant entirely.',
    }
  ),
  schema: schema.oneOf(
    [schema.literal(AIAssistantType.Observability), schema.literal(AIAssistantType.Never)],
    { defaultValue: AIAssistantType.Observability }
  ),
  // Convert enum values to strings to satisfy UiSettingsParams type
  options: [AIAssistantType.Observability, AIAssistantType.Never] as Array<
    (typeof AIAssistantType)[keyof typeof AIAssistantType]
  >,
  type: 'select' as const,
  optionLabels: {
    [AIAssistantType.Observability]: SHOW_SEARCH,
    [AIAssistantType.Never]: HIDE_ASSISTANT,
  },
  requiresPageReload: true,
  solutionViews: ['es'],
};
