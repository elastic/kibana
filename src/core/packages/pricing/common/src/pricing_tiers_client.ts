/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PricingProduct, ProductFeaturesRegistry } from '@kbn/core-pricing-common';
import { isEqual } from 'lodash';
import { PricingConfigType } from '../../server-internal/src/pricing_config';
import { IPricingTiersClient } from './types';

export class PricingTiersClient implements IPricingTiersClient {
  constructor(
    private readonly tiers: PricingConfigType['tiers'],
    private readonly productFeaturesRegistry: ProductFeaturesRegistry
  ) {}

  getActiveProducts(): PricingProduct[] {
    return this.tiers.products ?? [];
  }

  isActiveProduct(product: PricingProduct) {
    return Boolean(this.tiers.products?.some((currentProduct) => isEqual(currentProduct, product)));
  }

  isEnabled() {
    return this.tiers.enabled;
  }

  isFeatureAvailable(featureId: string): boolean {
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
  }
}
