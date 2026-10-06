import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
/**
 * Type definition of the Feature Flags configuration
 * @internal
 */
export interface FeatureFlagsConfig {
    overrides?: Record<string, unknown>;
}
/**
 * Config descriptor for the feature flags service
 * @internal
 */
export declare const featureFlagsConfig: ServiceConfigDescriptor<FeatureFlagsConfig>;
