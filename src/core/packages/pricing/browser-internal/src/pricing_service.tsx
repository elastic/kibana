/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { GetPricingResponse, PricingServiceStart } from '@kbn/core-pricing-browser';
import { PricingTiersClient, ProductFeaturesRegistry } from '@kbn/core-pricing-common';

interface StartDeps {
  http: InternalHttpStart;
}

/**
 * Service that is responsible for UI Pricing.
 * @internal
 */
export class PricingService {
  public async start({ http }: StartDeps): Promise<PricingServiceStart> {
    const pricingResponse = await http.get<GetPricingResponse>('/internal/core/pricing');

    return {
      tiers: new PricingTiersClient(
        pricingResponse.tiers,
        new ProductFeaturesRegistry(pricingResponse.product_features)
      ),
    };
  }
}
