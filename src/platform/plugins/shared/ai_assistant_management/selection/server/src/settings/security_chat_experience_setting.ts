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
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_AGENT, CLASSIC_AI_ASSISTANT } from './translations';

const SECURITY_CHAT_EXPERIENCE_TITLE = i18n.translate(
  'aiAssistantManagementSelection.securityPreferredChatExperienceSettingName',
  {
    defaultMessage: 'Security Chat Experience',
  }
);

export const securityChatExperienceSetting: Omit<UiSettingsParams<AIChatExperience>, 'value'> = {
  name: SECURITY_CHAT_EXPERIENCE_TITLE,
  description: i18n.translate(
    'aiAssistantManagementSelection.securityPreferredChatExperienceSettingDescription',
    {
      defaultMessage:
        'Choose which chat experience to use for all users in this space when working in Security pages. This setting takes precedence over the global Chat Experience setting.',
    }
  ),
  schema: schema.oneOf(
    [schema.literal(AIChatExperience.Classic), schema.literal(AIChatExperience.Agent)],
    { defaultValue: AIChatExperience.Agent }
  ),
  options: [AIChatExperience.Classic, AIChatExperience.Agent],
  type: 'select' as const,
  optionLabels: {
    [AIChatExperience.Classic]: CLASSIC_AI_ASSISTANT,
    [AIChatExperience.Agent]: AI_AGENT,
  },
  requiresPageReload: true,
  solutionViews: [], // Display across all solutions
  // Hide the setting in Kibana -> Advanced Settings
  readonly: true,
  readonlyMode: 'ui',
};
