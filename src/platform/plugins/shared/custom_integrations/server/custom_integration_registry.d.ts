import type { Logger } from '@kbn/core/server';
import type { CustomIntegration } from '../common';
export declare class CustomIntegrationRegistry {
    private readonly _integrations;
    private readonly _logger;
    private readonly _isDev;
    /**
     * Deferred initializers registered via {@link registerDeferredInitializer}.  They are
     * called (in order, exactly once) the first time the integration list is read, so that
     * callers can avoid executing expensive work (e.g. evaluating i18n strings) at plugin
     * start time.
     */
    private readonly _deferredInitializers;
    constructor(logger: Logger, isDev: boolean);
    registerDeferredInitializer(init: () => void): void;
    private _materializeDeferredInitializers;
    registerCustomIntegration(customIntegration: CustomIntegration): void;
    getAppendCustomIntegrations(): CustomIntegration[];
    getReplacementCustomIntegrations(): CustomIntegration[];
}
