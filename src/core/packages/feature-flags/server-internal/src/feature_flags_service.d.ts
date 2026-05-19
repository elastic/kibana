import type { CoreContext } from '@kbn/core-base-server-internal';
import type { FeatureFlagsSetup, FeatureFlagsStart } from '@kbn/core-feature-flags-server';
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
    /**
     * The core service's constructor
     * @param core {@link CoreContext}
     */
    constructor(core: CoreContext);
    /**
     * Setup lifecycle method
     */
    setup(): InternalFeatureFlagsSetup;
    /**
     * Start lifecycle method
     */
    start(): FeatureFlagsStart;
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
}
