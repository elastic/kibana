import type { FeatureFlagsRequestHandlerContext, FeatureFlagsStart } from '@kbn/core-feature-flags-server';
/**
 * The {@link FeatureFlagsRequestHandlerContext} implementation.
 * @internal
 */
export declare class CoreFeatureFlagsRouteHandlerContext implements FeatureFlagsRequestHandlerContext {
    private readonly featureFlags;
    constructor(featureFlags: FeatureFlagsStart);
    getBooleanValue(flagName: string, fallback: boolean): Promise<boolean>;
    getStringValue<Value extends string>(flagName: string, fallback: Value): Promise<Value>;
    getNumberValue<Value extends number>(flagName: string, fallback: Value): Promise<Value>;
}
