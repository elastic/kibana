import type { FC, PropsWithChildren } from 'react';
import type { CustomIntegration } from '../common';
export interface CustomIntegrationsSetup {
    getAppendCustomIntegrations: () => Promise<CustomIntegration[]>;
    getReplacementCustomIntegrations: () => Promise<CustomIntegration[]>;
}
export interface CustomIntegrationsStart {
    ContextProvider: FC<PropsWithChildren<unknown>>;
    languageClientsUiComponents: Record<string, FC>;
}
export interface CustomIntegrationsStartDependencies {
}
