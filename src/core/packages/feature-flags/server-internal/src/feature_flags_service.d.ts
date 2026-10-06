import type { CoreContext } from '@kbn/core-base-server-internal';
import type { FeatureFlagsSetup, FeatureFlagsStart } from '@kbn/core-feature-flags-server';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
/**
 * Core-internal contract for the setup lifecycle step.
 * @internal
 */
export interface InternalFeatureFlagsSetup extends FeatureFlagsSetup {
    /**
     * Used by the rendering service to share the overrides with the service on the browser side.
     */
    getOverrides: () => Record<string, unknown>;
    /**
     * Required to bootstrap the browser-side OpenFeature client with a seed of the feature flags for faster load-times
     * and to work-around air-gapped environments.
     */
    getInitialFeatureFlags: () => Promise<Record<string, unknown>>;
}
export interface FeatureFlagsSetupDeps {
    http: InternalHttpServiceSetup;
}
/**
 * Start contract used inside core. One-shot evaluation stays available for the HTTP
 * request-handler context. Plugin start contracts only receive {@link FeatureFlagsStart}.
 * @internal
 */
export interface InternalFeatureFlagsStart extends FeatureFlagsStart {
    /**
     * Evaluates a boolean flag for the current request-handler context.
     * @param flagName The flag ID to evaluate
     * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
     */
    getBooleanValue(flagName: string, fallbackValue: boolean): Promise<boolean>;
    /**
     * Evaluates a string flag for the current request-handler context.
     * @param flagName The flag ID to evaluate
     * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
     */
    getStringValue<Value extends string>(flagName: string, fallbackValue: Value): Promise<Value>;
    /**
     * Evaluates a number flag for the current request-handler context.
     * @param flagName The flag ID to evaluate
     * @param fallbackValue If the flag cannot be evaluated for whatever reason, the fallback value is provided.
     */
    getNumberValue<Value extends number>(flagName: string, fallbackValue: Value): Promise<Value>;
}
/**
 * The server-side Feature Flags Service
 * @internal
 */
export declare class FeatureFlagsService {
    private readonly core;
    private readonly featureFlagsClient;
    private readonly logger;
    private readonly stop$;
    private readonly overrides$;
    private readonly contextChanged$;
    private context;
    private initialFeatureFlagsGetter;
    private waitForContextReadyPromise;
    /**
     * The core service's constructor
     * @param core {@link CoreContext}
     */
    constructor(core: CoreContext);
    /**
     * Setup lifecycle method
     */
    setup({ http }: FeatureFlagsSetupDeps): InternalFeatureFlagsSetup;
    /**
     * Start lifecycle method
     */
    start(): InternalFeatureFlagsStart;
    /**
     * Stop lifecycle method
     */
    stop(): Promise<void>;
    /**
     * Wrapper to evaluate flags with the common config overrides interceptions + APM and counters reporting
     * @param evaluationFn The actual evaluation API
     * @param flagName The name of the flag to evaluate
     * @param fallbackValue The fallback value
     * @internal
     */
    private evaluateFlag;
    /**
     * Formats the provided context to fulfill the expected multi-context structure.
     * @param contextToAppend The {@link EvaluationContext} to append.
     * @internal
     */
    private appendContext;
    private registerCounterRoute;
    /**
     * Waits for the context to be ready.
     * This is needed to avoid race conditions on early flag evaluations during startup.
     * @internal
     */
    private waitForContextReady;
    /**
     * Checks if we need to wait for the context to be ready.
     * @internal
     */
    private mustWaitForContextReady;
}
