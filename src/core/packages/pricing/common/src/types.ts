/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PricingProduct } from './pricing_tiers_config';

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
  products: PricingProduct[];
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
}
