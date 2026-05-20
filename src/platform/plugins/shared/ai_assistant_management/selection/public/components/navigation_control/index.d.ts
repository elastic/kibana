import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AIExperienceSelection } from '../../types';
interface AIAssistantHeaderButtonProps {
    coreStart: CoreStart;
    isSecurityAIAssistantEnabled: boolean;
    isObservabilityAIAssistantEnabled: boolean;
    triggerOpenChat: (selection: AIExperienceSelection) => void;
}
export declare const AIAssistantHeaderButton: React.FC<AIAssistantHeaderButtonProps>;
export {};
