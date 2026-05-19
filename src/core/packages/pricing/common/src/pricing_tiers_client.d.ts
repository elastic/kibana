import type { IPricingTiersClient, PricingProduct } from './types';
import type { TiersConfig } from './pricing_tiers_config';
import type { ProductFeaturesRegistry } from './product_features_registry';
/**
 * Client implementation for checking feature availability based on pricing tiers.
 *
 * This client evaluates whether features are available based on the current pricing tier configuration
 * and the registered product features.
 *
 * @public
 */
export declare class PricingTiersClient implements IPricingTiersClient {
    private tiers;
    private readonly productFeaturesRegistry;
    /**
     * Creates a new PricingTiersClient instance.
     *
     * @param tiers - The current pricing tiers configuration
     * @param productFeaturesRegistry - Registry containing the available product features
     */
    constructor(tiers: TiersConfig, productFeaturesRegistry: ProductFeaturesRegistry);
    /**
     * Sets the pricing tiers configuration.
     *
     * @param tiers - The new pricing tiers configuration
     */
    setTiers: (tiers: TiersConfig) => void;
    /**
     * Checks if pricing tiers are enabled in the current configuration.
     *
     * @returns True if pricing tiers are enabled, false otherwise
     * @internal
     */
    private isEnabled;
    /**
     * Checks if a product is active in the current pricing tier configuration.
     *
     * @param product - The product to check
     * @returns True if the product is active, false otherwise
     * @internal
     */
    private isActiveProduct;
    /**
     * Determines if a feature is available based on the current pricing tier configuration.
     * When pricing tiers are disabled, all features are considered available.
     * When pricing tiers are enabled, a feature is available if it's associated with at least one active product.
     *
     * @param featureId - The identifier of the feature to check
     * @returns True if the feature is available in the current pricing tier, false otherwise
     */
    isFeatureAvailable: <TFeatureId extends string>(featureId: TFeatureId) => boolean;
    getActiveProduct: () => PricingProduct | undefined;
}
