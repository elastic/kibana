import type { Plugin, PluginInitializerContext } from '@kbn/core/public';
import { type CoreSetup, type CoreStart } from '@kbn/core/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ServerlessPluginSetup } from '@kbn/serverless/public';
import type { Observable } from 'rxjs';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { AIAssistantType } from '../common/ai_assistant_type';
import type { AIExperienceSelection } from './types';
export interface AIAssistantManagementSelectionPluginPublicSetup {
}
export interface AIAssistantManagementSelectionPluginPublicStart {
    aiAssistantType$: Observable<AIAssistantType>;
    openChat$: Observable<AIExperienceSelection>;
    completeOpenChat(): void;
}
export interface SetupDependencies {
    management: ManagementSetup;
    home?: HomePublicPluginSetup;
    serverless?: ServerlessPluginSetup;
}
export interface StartDependencies {
    licensing: LicensingPluginStart;
    spaces?: SpacesPluginStart;
}
export declare class AIAssistantManagementPlugin implements Plugin<AIAssistantManagementSelectionPluginPublicSetup, AIAssistantManagementSelectionPluginPublicStart, SetupDependencies, StartDependencies> {
    private readonly initializerContext;
    private readonly kibanaBranch;
    private readonly buildFlavor;
    private readonly isServerless;
    private registeredAiAssistantManagementSelectionApp?;
    private managementAppVisibilitySubscription?;
    private aiAssistantTypeSubscription?;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<StartDependencies, AIAssistantManagementSelectionPluginPublicStart>, { home, management, serverless }: SetupDependencies): AIAssistantManagementSelectionPluginPublicSetup;
    start(coreStart: CoreStart, startDeps: StartDependencies): {
        aiAssistantType$: Observable<AIAssistantType>;
        openChat$: Observable<AIExperienceSelection>;
        completeOpenChat: () => void;
    };
    private registerNavControl;
    stop(): void;
}
