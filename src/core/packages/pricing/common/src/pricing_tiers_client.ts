/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import type { IPricingTiersClient, PricingProduct, PricingProductSecurity } from './types';
import type { IPricingProduct, TiersConfig } from './pricing_tiers_config';
import { ProductFeaturesRegistry } from './product_features_registry';

/**
 * Client implementation for checking feature availability based on pricing tiers.
 *
 * This client evaluates whether features are available based on the current pricing tier configuration
 * and the registered product features.
 *
 * @public
 */
export class PricingTiersClient implements IPricingTiersClient {
  /**
   * Creates a new PricingTiersClient instance.
   *
   * @param tiers - The current pricing tiers configuration
   * @param productFeaturesRegistry - Registry containing the available product features
   */
  constructor(
    private tiers: TiersConfig,
    private readonly productFeaturesRegistry: ProductFeaturesRegistry
  ) {}

  /**
   * Sets the pricing tiers configuration.
   *
   * @param tiers - The new pricing tiers configuration
   */
  setTiers = (tiers: TiersConfig) => {
    this.tiers = tiers;
  };

  /**
   * Checks if pricing tiers are enabled in the current configuration.
   *
   * @returns True if pricing tiers are enabled, false otherwise
   * @internal
   */
  private isEnabled = () => {
    return this.tiers.enabled;
  };

  /**
   * Checks if a product is active in the current pricing tier configuration.
   *
   * @param product - The product to check
   * @returns True if the product is active, false otherwise
   * @internal
   */
  private isActiveProduct = (product: IPricingProduct) => {
    return Boolean(this.tiers.products?.some((currentProduct) => isEqual(currentProduct, product)));
  };

  /**
   * Determines if a feature is available based on the current pricing tier configuration.
   * When pricing tiers are disabled, all features are considered available.
   * When pricing tiers are enabled, a feature is available if it's associated with at least one active product.
   *
   * @param featureId - The identifier of the feature to check
   * @returns True if the feature is available in the current pricing tier, false otherwise
   */
  public isFeatureAvailable = <TFeatureId extends string>(featureId: TFeatureId): boolean => {
    /**
     * We assume that when the pricing tiers are disabled, features are available globally
     * and not constrained by any product tier.
     */
    if (!this.isEnabled()) {
      return true;
    }

    const feature = this.productFeaturesRegistry.get(featureId);

    if (feature) {
      return feature.products.some((product) => this.isActiveProduct(product));
    }

    return false;
  };

  public getActiveProduct = (): PricingProduct | undefined => {
    if (this.tiers.enabled === false || this.tiers.products == null) {
      return undefined;
    }

    if (this.tiers.products[0].name === 'observability') {
      return {
        type: 'observability' as const,
        tier: this.tiers.products[0].tier,
      };
    } else {
      // Security product type - schema validation guarantees all products are security-related
      // and have the same tier
      return {
        type: 'security' as const,
        tier: this.tiers.products[0].tier,
        // 'security' is not a real product line / addon, it's only used to be able to define the tier when no addons are active
        product_lines: this.tiers.products
          .map((p) => p.name)
          .filter((name) => name !== 'security') as PricingProductSecurity['product_lines'],
      };
    }
  };
}
