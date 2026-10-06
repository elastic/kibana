import type { CustomIntegration } from '../common';
export interface CustomIntegrationsPluginSetup {
    registerCustomIntegration(customIntegration: Omit<CustomIntegration, 'type'>): void;
    getAppendCustomIntegrations(): CustomIntegration[];
    /**
     * Registers a deferred initializer that will be called (once, in registration order) the
     * first time the integration list is read.  Use this to avoid evaluating i18n strings and
     * building registration payloads at plugin start time — work is deferred to the first
     * incoming HTTP request instead.
     */
    registerDeferredIntegrations(init: () => void): void;
}
export interface CustomIntegrationsPluginStart {
}
