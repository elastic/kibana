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

interface PricingTiersClientDeps {
  pricingConfig: PricingConfigType;
  productFeaturesRegistry: ProductFeaturesRegistry;
}

export class PricingTiersClient implements IPricingTiersClient {
  private constructor(
    private readonly pricingConfig: PricingConfigType,
    private readonly productFeaturesRegistry: ProductFeaturesRegistry
  ) {}

  getActiveProducts(): PricingProduct[] {
    return this.pricingConfig.tiers.products ?? [];
  }

  isActiveProduct(product: PricingProduct) {
    return Boolean(
      this.pricingConfig.tiers.products?.some((currentProduct) => isEqual(currentProduct, product))
    );
  }

  isFeatureAvailable(featureId: string): boolean {
    const feature = this.productFeaturesRegistry.get(featureId);

    if (feature) {
      return feature.products.some((product) => this.isActiveProduct(product));
    }

    return false;
  }

  public static create({ pricingConfig, productFeaturesRegistry }: PricingTiersClientDeps) {
    return new PricingTiersClient(pricingConfig, productFeaturesRegistry);
  }
}
