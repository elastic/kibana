/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PricingProductFeature } from './types';

export class ProductFeaturesRegistry {
  private readonly productFeatures: Map<string, PricingProductFeature>;

  constructor(initialFeatures: Record<string, PricingProductFeature> = {}) {
    this.productFeatures = new Map(Object.entries(initialFeatures));
  }

  get(featureId: string): PricingProductFeature | undefined {
    return this.productFeatures.get(featureId);
  }

  register(feature: PricingProductFeature) {
    if (this.productFeatures.has(feature.id)) {
      throw new Error(
        `A product feature with id "${feature.id}" is already registered, please change id or check whether is the same feature.`
      );
    }

    this.productFeatures.set(feature.id, feature);
  }

  asObject(): Record<string, PricingProductFeature> {
    return Object.fromEntries(this.productFeatures);
  }
}
