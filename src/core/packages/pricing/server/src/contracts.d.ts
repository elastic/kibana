import type { PricingProductFeature } from '@kbn/core-pricing-common';
/**
 * APIs to manage pricing product features during the setup phase.
 *
 * Plugins that want to register features that are available in specific pricing tiers
 * should use the `registerProductFeatures` method during the setup phase.
 *
 * @public
 */
export interface PricingServiceSetup {
    /**
     * Check if a specific feature is available in the current pricing tier configuration.
     * Resolves asynchronously after the pricing service has been set up and all the plugins have registered their features.
     *
     * @example
     * ```ts
     * // my-plugin/server/plugin.ts
     * public setup(core: CoreSetup) {
     *   const isPremiumFeatureAvailable = core.pricing.isFeatureAvailable('my_premium_feature');
     * }
     * ```
     */
    isFeatureAvailable(featureId: string): Promise<boolean>;
    /**
     * Register product features that are available in specific pricing tiers.
     *
     * @example
     * ```ts
     * // my-plugin/server/plugin.ts
     * public setup(core: CoreSetup) {
     *   core.pricing.registerProductFeatures([
     *     {
     *       id: 'my_premium_feature',
     *       description: 'A premium feature only available in specific tiers',
     *       products: [{ name: 'security', tier: 'complete' }]
     *     }
     *   ]);
     * }
     * ```
     */
    registerProductFeatures(features: PricingProductFeature[]): void;
}
