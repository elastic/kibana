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
import { AIChatExperience } from '../../../common/ai_chat_experience';
import { AI_AGENT, CHAT_EXPERIENCE_TITLE, CLASSIC_AI_ASSISTANT } from './translations';

// Define the chatExperienceSetting with proper typing
export const chatExperienceSetting: Omit<UiSettingsParams<AIChatExperience>, 'value'> = {
  name: CHAT_EXPERIENCE_TITLE,
  description: i18n.translate(
    'aiAssistantManagementSelection.preferredChatExperienceSettingDescription',
    {
      defaultMessage:
        'Choose which chat experience should be the default for all users in this space, between Classic Al Assistant or Al Agents. {link}',
      values: {
        // TODO: add the actual link when available and possibly use EuiLink component
        link: '<a href="https://www.elastic.co/guide/en/kibana/solutions/observability/observability-ai-assistant" target="_blank" rel="noopener noreferrer">Learn more</a>',
      },
    }
  ),
  schema: schema.oneOf(
    [schema.literal(AIChatExperience.Classic), schema.literal(AIChatExperience.Agents)],
    { defaultValue: AIChatExperience.Classic }
  ),
  options: [AIChatExperience.Classic, AIChatExperience.Agents],
  type: 'select' as const,
  optionLabels: {
    [AIChatExperience.Classic]: CLASSIC_AI_ASSISTANT,
    [AIChatExperience.Agents]: AI_AGENT,
  },
  requiresPageReload: true,
  solutionViews: [], // Display across all solutions
  // Hide the setting in Kibana -> Advanced Settigns
  readonly: true,
  readonlyMode: 'ui',
};
