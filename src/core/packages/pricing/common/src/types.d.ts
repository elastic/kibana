import type { IPricingProduct } from './pricing_tiers_config';
/**
 * APIs to access pricing tier information during the start phase.
 *
 * @public
 */
export interface PricingServiceStart {
    /**
     * Check if a specific feature is available based on the current pricing tier configuration.
     * Delegates to the underlying {@link IPricingTiersClient.isFeatureAvailable} implementation.
     *
     * @param featureId - The identifier of the feature to check
     * @returns True if the feature is available in the current pricing tier, false otherwise
     *
     * @example
     * ```ts
     * // my-plugin/server/plugin.ts OR my-plugin/public/plugin.ts
     * public start(core: CoreStart) {
     *   const isPremiumFeatureAvailable = core.pricing.isFeatureAvailable('my_premium_feature');
     *   // Use the availability information to enable/disable functionality
     * }
     * ```
     */
    isFeatureAvailable: IPricingTiersClient['isFeatureAvailable'];
    /**
     * @deprecated Use {@link PricingServiceStart.isFeatureAvailable} instead.
     */
    getActiveProduct: IPricingTiersClient['getActiveProduct'];
}
/**
 * Represents a feature that is registered for specific pricing tiers.
 *
 * @public
 */
export interface PricingProductFeature {
    id: string;
    description: string;
    products: IPricingProduct[];
}
/**
 * Client interface for checking feature availability based on pricing tiers.
 *
 * @public
 */
export interface IPricingTiersClient {
    /**
     * Determines if a feature is available based on the current pricing tier configuration.
     *
     * @param featureId - The identifier of the feature to check
     * @returns True if the feature is available in the current pricing tier, false otherwise
     */
    isFeatureAvailable<TFeatureId extends string>(featureId: TFeatureId): boolean;
    /**
     * @deprecated Don't rely on this API for customizing serverless tiers. Register a dedicated feature and use {@link IPricingTiersClient.isFeatureAvailable} instead.
     */
    getActiveProduct(): PricingProduct | undefined;
}
export interface PricingProductSecurity {
    type: 'security';
    tier: 'search_ai_lake' | 'complete' | 'essentials';
    product_lines: Array<'ai_soc' | 'endpoint' | 'cloud'>;
}
export interface PricingProductObservability {
    type: 'observability';
    tier: 'complete' | 'logs_essentials';
}
export type PricingProduct = PricingProductSecurity | PricingProductObservability;
export interface GetPricingResponseV1 {
    tiers: {
        enabled: boolean;
        products?: IPricingProduct[];
    };
    product_features: Record<string, PricingProductFeature>;
}
