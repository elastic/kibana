import type { AgentConfigOptions } from '@elastic/apm-rum';
import type { ExecutionContextStart } from '@kbn/core-execution-context-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
/**
 * This is the entry point used to boot the frontend when serving a application
 * that lives in the Kibana Platform.
 */
interface ApmConfig extends AgentConfigOptions {
    globalLabels?: Record<string, string>;
}
interface StartDeps {
    application: InternalApplicationStart;
    executionContext: ExecutionContextStart;
}
export declare class ApmSystem {
    private readonly apmConfig?;
    private readonly basePath;
    private readonly enabled;
    private pageLoadTransaction?;
    private resourceObserver;
    private apm?;
    private executionContext?;
    /**
     * `apmConfig` would be populated with relevant APM RUM agent
     * configuration if server is started with elastic.apm.* config.
     */
    constructor(apmConfig?: ApmConfig | undefined, basePath?: string);
    setup(): Promise<void>;
    start(start?: StartDeps): Promise<void>;
    private holdPageLoadTransaction;
    private closePageLoadTransaction;
    private markPageLoadStart;
    /**
     * Adds an observer to the APM configuration for normalizing transactions of the 'http-request' type to remove the
     * hostname, protocol, port, and base path. Allows for correlating data cross different deployments.
     */
    private addHttpRequestNormalization;
    /**
     * Set route-change transaction name to the destination page name taken from
     * the execution context. Otherwise, all route change transactions would have
     * default names, like 'Click - span' or 'Click - a' instead of more
     * descriptive '/security/rules/:id/edit'.
     */
    private addRouteChangeNormalization;
}
export {};
