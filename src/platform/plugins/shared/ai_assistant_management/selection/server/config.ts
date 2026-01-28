/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AIAssistantType } from '../common/ai_assistant_type';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  preferredAIAssistantType: schema.oneOf(
    [
      schema.literal(AIAssistantType.Default),
      schema.literal(AIAssistantType.Never),
      schema.literal(AIAssistantType.Observability),
      schema.literal(AIAssistantType.Security),
    ],
    { defaultValue: AIAssistantType.Default }
  ),
  preferredChatExperience: schema.oneOf(
    [schema.literal(AIChatExperience.Classic), schema.literal(AIChatExperience.Agent)],
    { defaultValue: AIChatExperience.Classic }
  ),
});

export type AIAssistantManagementSelectionConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AIAssistantManagementSelectionConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    preferredAIAssistantType: true,
    preferredChatExperience: true,
  },
};
