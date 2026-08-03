import React from 'react';
import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { AIChatExperience } from '@kbn/ai-assistant-common';
import type { CoreStart } from '@kbn/core/public';
import type { BuildFlavor } from '@kbn/config';
import type { Observable } from 'rxjs';
import type { StartDependencies } from './plugin';
interface ContextValue extends StartDependencies {
    setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
    capabilities: CoreStart['application']['capabilities'];
    navigateToApp: CoreStart['application']['navigateToApp'];
    kibanaBranch: string;
    buildFlavor: BuildFlavor;
    securityAIAssistantEnabled: boolean;
    chatExperience$: Observable<AIChatExperience>;
}
export declare const AppContextProvider: ({ children, value, }: {
    value: ContextValue;
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const useAppContext: () => ContextValue;
export {};
