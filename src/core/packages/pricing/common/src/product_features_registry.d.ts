import type { PricingProductFeature } from './types';
/**
 * Registry for managing pricing product features.
 * Provides methods to register, retrieve, and manage features that are available in specific pricing tiers.
 *
 * @public
 */
export declare class ProductFeaturesRegistry {
    /**
     * Internal storage for registered product features.
     * @internal
     */
    private readonly productFeatures;
    /**
     * Creates a new ProductFeaturesRegistry instance.
     *
     * @param initialFeatures - Optional initial set of features to populate the registry
     */
    constructor(initialFeatures?: Record<string, PricingProductFeature>);
    /**
     * Retrieves a product feature by its ID.
     *
     * @param featureId - The ID of the feature to retrieve
     * @returns The product feature if found, undefined otherwise
     */
    get(featureId: string): PricingProductFeature | undefined;
    /**
     * Registers a new product feature in the registry.
     * Throws an error if a feature with the same ID is already registered.
     *
     * @param feature - The product feature to register
     * @throws Error if a feature with the same ID is already registered
     */
    register(feature: PricingProductFeature): void;
    /**
     * Converts the registry to a plain JavaScript object.
     *
     * @returns A record mapping feature IDs to their corresponding feature objects
     */
    asObject(): Record<string, PricingProductFeature>;
}
