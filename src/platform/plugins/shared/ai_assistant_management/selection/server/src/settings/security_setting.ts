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
import { SHOW_SECURITY, HIDE_ASSISTANT, TITLE } from './translations';

// Define the securitySolutionSetting with proper typing
export const securitySolutionSetting: Omit<
  UiSettingsParams<AIAssistantType.Security | AIAssistantType.Never>,
  'value'
> = {
  name: TITLE,
  description: i18n.translate(
    'aiAssistantManagementSelection.securitySolutionSetting.preferredAIAssistantTypeSettingDescription',
    {
      defaultMessage:
        'Choose if the Security AI Assistant is available. Show the Security AI Assistant, or hide the Assistant entirely.',
    }
  ),
  schema: schema.oneOf(
    [schema.literal(AIAssistantType.Security), schema.literal(AIAssistantType.Never)],
    { defaultValue: AIAssistantType.Security }
  ),
  options: [AIAssistantType.Security, AIAssistantType.Never],
  type: 'select' as const,
  optionLabels: {
    [AIAssistantType.Security]: SHOW_SECURITY,
    [AIAssistantType.Never]: HIDE_ASSISTANT,
  },
  requiresPageReload: true,
  solution: 'security',
};
