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
