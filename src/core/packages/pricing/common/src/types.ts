/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PricingProduct } from './pricing_tiers_config';

export interface PricingProductFeature {
  id: string;
  products: PricingProduct[];
}

export interface IPricingTiersClient {
  getActiveProducts(): PricingProduct[];
  isActiveProduct(product: PricingProduct): boolean;
  isEnabled(): boolean;
  isFeatureAvailable(featureId: string): boolean;
}
