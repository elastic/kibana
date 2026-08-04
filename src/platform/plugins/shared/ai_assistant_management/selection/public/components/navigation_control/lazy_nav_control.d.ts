import type { CoreStart } from '@kbn/core/public';
import React from 'react';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { AIExperienceSelection } from '../../types';
export declare const NavControlInitiator: ({ coreStart, isSecurityAIAssistantEnabled, isObservabilityAIAssistantEnabled, triggerOpenChat, spaces, }: {
    coreStart: CoreStart;
    isSecurityAIAssistantEnabled: boolean;
    isObservabilityAIAssistantEnabled: boolean;
    triggerOpenChat: (selection: AIExperienceSelection) => void;
    spaces?: SpacesPluginStart;
}) => React.JSX.Element | null;
