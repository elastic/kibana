import type { LoggerFactory } from '@kbn/logging';
import type { Env, RawConfigurationProvider } from '@kbn/config';
/**
 * Top-level entry point to kick off the app and start the Kibana server.
 */
export declare class Root {
    private readonly onShutdown?;
    readonly logger: LoggerFactory;
    private readonly log;
    private readonly loggingSystem;
    private readonly server;
    private loggingConfigSubscription?;
    private apmConfigSubscription?;
    private shuttingDown;
    constructor(rawConfigProvider: RawConfigurationProvider, env: Env, onShutdown?: ((reason?: Error | string) => void) | undefined);
    preboot(): Promise<import("@kbn/core/packages/lifecycle/server-internal").InternalCorePreboot | undefined>;
    setup(): Promise<import("@kbn/core/packages/lifecycle/server-internal").InternalCoreSetup>;
    start(): Promise<import("@kbn/core/packages/lifecycle/server-internal").InternalCoreStart>;
    shutdown(reason?: any): Promise<void>;
    getConfigService(): import("@kbn/config").ConfigService;
    private setupApmLabelSync;
    private setupLogging;
}
