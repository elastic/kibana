import type { CoreContext } from '@kbn/core-base-browser-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { FeatureFlagsSetup, FeatureFlagsStart } from '@kbn/core-feature-flags-browser';
/**
 * setup method dependencies
 * @internal
 */
export interface FeatureFlagsSetupDeps {
    /**
     * Used to read the flag overrides set up in the configuration file.
     */
    injectedMetadata: InternalInjectedMetadataSetup;
}
/**
 * The browser-side Feature Flags Service
 * @internal
 */
export declare class FeatureFlagsService {
    private readonly featureFlagsClient;
    private readonly logger;
    private readonly contextChanged$;
    private isProviderReadyPromise?;
    private context;
    private overrides;
    /**
     * The core service's constructor
     * @param core {@link CoreContext}
     */
    constructor(core: CoreContext);
    /**
     * Setup lifecycle method
     * @param deps {@link FeatureFlagsSetup} including the {@link InternalInjectedMetadataSetup} used to retrieve the feature flags.
     */
    setup(deps: FeatureFlagsSetupDeps): FeatureFlagsSetup;
    /**
     * Start lifecycle method
     */
    start(): Promise<FeatureFlagsStart>;
    /**
     * Stop lifecycle method
     */
    stop(): Promise<void>;
    /**
     * Waits for the provider initialization with a timeout to avoid holding the page load for too long
     * @internal
     */
    private waitForProviderInitialization;
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
