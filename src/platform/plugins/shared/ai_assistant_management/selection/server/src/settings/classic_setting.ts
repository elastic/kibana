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
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { AIAssistantType } from '../../../common/ai_assistant_type';
import {
  ONLY_IN_THEIR_SOLUTIONS,
  OBSERVABILITY_IN_OTHER_APPS,
  SECURITY_IN_OTHER_APPS,
  HIDE_ALL_ASSISTANTS,
  AI_ASSISTANT_VISIBILITY_TITLE,
} from './translations';

// Define the classicSetting with proper typing
export const classicSetting: Omit<UiSettingsParams<AIAssistantType>, 'value'> = {
  name: AI_ASSISTANT_VISIBILITY_TITLE,
  description: i18n.translate(
    'aiAssistantManagementSelection.preferredAIAssistantTypeSettingDescription',
    {
      defaultMessage:
        'Configure AI Assistant availability for each solution. You can make them appear only in their own solutions, make a specific one appear throughout Kibana, or hide them completely.',
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
  solutionViews: ['classic'],
  // Hide the setting in Kibana -> Advanced Settigns
  readonly: true,
  readonlyMode: 'ui',
};
