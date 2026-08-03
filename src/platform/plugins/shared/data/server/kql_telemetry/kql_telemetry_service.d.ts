import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
export declare class KqlTelemetryService implements Plugin<void> {
    private initializerContext;
    constructor(initializerContext: PluginInitializerContext);
    setup({ http, getStartServices, savedObjects }: CoreSetup, { usageCollection }: {
        usageCollection?: UsageCollectionSetup;
    }): void;
    start(): void;
}
