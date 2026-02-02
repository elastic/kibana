/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AIChatExperience } from '@kbn/ai-assistant-common';
import type { AIAssistantType } from '../common/ai_assistant_type';

export interface ConfigSchema {
  preferredAIAssistantType: AIAssistantType;
}

/**
 * Union type representing all possible AI Experience selections.
 * Can be a classic assistant type (Observability, Security, etc.) or the AI Agent experience.
 */
export type AIExperienceSelection = AIAssistantType | AIChatExperience.Agent;
