/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { PluginConfigDescriptor } from '@kbn/core-plugins-server';
import { AIAssistantType } from '../common/ai_assistant_type';
import {
  PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  OBSERVABILITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  SECURITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
} from '../common/ui_setting_keys';

const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  preferredAIAssistantType: schema.oneOf(
    [
      schema.literal(AIAssistantType.Default),
      schema.literal(AIAssistantType.Never),
      schema.literal(AIAssistantType.Observability),
    ],
    { defaultValue: AIAssistantType.Default }
  ),
  serverlessUiSettingsKey: schema.oneOf(
    [
      schema.literal(PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY),
      schema.literal(OBSERVABILITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY),
      schema.literal(SECURITY_PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY),
    ],
    { defaultValue: PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY }
  ),
});

export type AIAssistantManagementSelectionConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AIAssistantManagementSelectionConfig> = {
  schema: configSchema,
  exposeToBrowser: {
    preferredAIAssistantType: true,
    serverlessUiSettingsKey: true,
  },
};
