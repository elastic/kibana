/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PricingProductFeature } from './types';

/**
 * Registry for managing pricing product features.
 * Provides methods to register, retrieve, and manage features that are available in specific pricing tiers.
 *
 * @public
 */
export class ProductFeaturesRegistry {
  /**
   * Internal storage for registered product features.
   * @internal
   */
  private readonly productFeatures: Map<string, PricingProductFeature>;

  /**
   * Creates a new ProductFeaturesRegistry instance.
   *
   * @param initialFeatures - Optional initial set of features to populate the registry
   */
  constructor(initialFeatures: Record<string, PricingProductFeature> = {}) {
    this.productFeatures = new Map(Object.entries(initialFeatures));
  }

  /**
   * Retrieves a product feature by its ID.
   *
   * @param featureId - The ID of the feature to retrieve
   * @returns The product feature if found, undefined otherwise
   */
  get(featureId: string): PricingProductFeature | undefined {
    return this.productFeatures.get(featureId);
  }

  /**
   * Registers a new product feature in the registry.
   * Throws an error if a feature with the same ID is already registered.
   *
   * @param feature - The product feature to register
   * @throws Error if a feature with the same ID is already registered
   */
  register(feature: PricingProductFeature) {
    if (this.productFeatures.has(feature.id)) {
      throw new Error(
        `A product feature with id "${feature.id}" is already registered, please change id or check whether is the same feature.`
      );
    }

    this.productFeatures.set(feature.id, feature);
  }

  /**
   * Converts the registry to a plain JavaScript object.
   *
   * @returns A record mapping feature IDs to their corresponding feature objects
   */
  asObject(): Record<string, PricingProductFeature> {
    return Object.fromEntries(this.productFeatures);
  }
}
