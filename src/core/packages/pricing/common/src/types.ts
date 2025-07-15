/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IPricingProduct } from './pricing_tiers_config';

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
  /* Unique identifier for the feature. */
  id: string;
  /* Human-readable description of the feature. */
  description: string;
  /* List of products and tiers where this feature is available. */
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
