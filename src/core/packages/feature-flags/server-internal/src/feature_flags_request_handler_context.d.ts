import type { FeatureFlagsRequestHandlerContext } from '@kbn/core-feature-flags-server';
import type { InternalFeatureFlagsStart } from './feature_flags_service';
/**
 * The {@link FeatureFlagsRequestHandlerContext} implementation.
 * @internal
 */
export declare class CoreFeatureFlagsRouteHandlerContext implements FeatureFlagsRequestHandlerContext {
    private readonly featureFlags;
    constructor(featureFlags: InternalFeatureFlagsStart);
    getBooleanValue(flagName: string, fallback: boolean): Promise<boolean>;
    getStringValue<Value extends string>(flagName: string, fallback: Value): Promise<Value>;
    getNumberValue<Value extends number>(flagName: string, fallback: Value): Promise<Value>;
}
