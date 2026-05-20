import type { PluginInitializerContext } from '@kbn/core/server';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").CustomIntegrationsPlugin>;
export type { CustomIntegrationsPluginSetup, CustomIntegrationsPluginStart } from './types';
export type { IntegrationCategory, CustomIntegration } from '../common';
export declare const config: {
    schema: import("@kbn/config-schema").ObjectType<{}>;
};
