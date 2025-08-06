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
import {
  ONLY_IN_THEIR_SOLUTIONS,
  OBSERVABILITY_IN_OTHER_APPS,
  SECURITY_IN_OTHER_APPS,
  HIDE_ALL_ASSISTANTS,
  TITLE,
} from './translations';

// Define the classicSetting with proper typing
export const classicSetting: Omit<UiSettingsParams<AIAssistantType>, 'value'> = {
  name: TITLE,
  description: i18n.translate(
    'aiAssistantManagementSelection.preferredAIAssistantTypeSettingDescription',
    {
      defaultMessage:
        'Choose where and which AI Assistants are available. You can limit the AI Assistants to their own solutions, show either the Observability and Search AI Assistants or the Security AI Assistant in other Kibana apps, or hide AI Assistants entirely.',
    }
  ),
  schema: schema.oneOf(
    [
      schema.literal(AIAssistantType.Default),
      schema.literal(AIAssistantType.Observability),
      schema.literal(AIAssistantType.Security),
      schema.literal(AIAssistantType.Never),
    ],
    { defaultValue: AIAssistantType.Default }
  ),
  options: [
    AIAssistantType.Default,
    AIAssistantType.Observability,
    AIAssistantType.Security,
    AIAssistantType.Never,
  ],
  type: 'select' as const,
  optionLabels: {
    [AIAssistantType.Default]: ONLY_IN_THEIR_SOLUTIONS,
    [AIAssistantType.Observability]: OBSERVABILITY_IN_OTHER_APPS,
    [AIAssistantType.Security]: SECURITY_IN_OTHER_APPS,
    [AIAssistantType.Never]: HIDE_ALL_ASSISTANTS,
  },
  requiresPageReload: true,
};
