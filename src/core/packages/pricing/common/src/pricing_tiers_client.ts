/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { IPricingTiersClient } from './types';
import { PricingProduct, TiersConfig } from './pricing_tiers_config';
import { ProductFeaturesRegistry } from './product_features_registry';

export class PricingTiersClient implements IPricingTiersClient {
  constructor(
    private readonly tiers: TiersConfig,
    private readonly productFeaturesRegistry: ProductFeaturesRegistry
  ) {}

  private isActiveProduct = (product: PricingProduct) => {
    return Boolean(this.tiers.products?.some((currentProduct) => isEqual(currentProduct, product)));
  };

  private isEnabled = () => {
    return this.tiers.enabled;
  };

  isFeatureAvailable = <TFeatureId extends string>(featureId: TFeatureId): boolean => {
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
}
