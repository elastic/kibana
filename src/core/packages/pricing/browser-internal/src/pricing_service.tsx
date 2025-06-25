/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject, of } from 'rxjs';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { GetPricingResponse, PricingServiceStart } from '@kbn/core-pricing-browser';
import {
  PricingTiersClient,
  ProductFeaturesRegistry,
  registerAnalyticsContextProvider,
} from '@kbn/core-pricing-common';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';

interface SetupDeps {
  analytics: AnalyticsServiceSetup;
}
interface StartDeps {
  http: InternalHttpStart;
}

const defaultPricingResponse: GetPricingResponse = {
  tiers: {
    enabled: false,
    products: [],
  },
  product_features: {},
};

/**
 * Service that is responsible for UI Pricing.
 * @internal
 */
export class PricingService {
  private readonly pricingTiers$ = new Subject<GetPricingResponse['tiers']>();

  public setup({ analytics }: SetupDeps): void {
    registerAnalyticsContextProvider(analytics, this.pricingTiers$);
  }

  public async start({ http }: StartDeps): Promise<PricingServiceStart> {
    const isAnonymous = http.anonymousPaths.isAnonymous(window.location.pathname);
    const pricingResponse = isAnonymous
      ? defaultPricingResponse
      : await http.get<GetPricingResponse>('/internal/core/pricing');

    this.pricingTiers$.next(pricingResponse.tiers);
    this.pricingTiers$.complete(); // complete the subject after fetching the pricing response as we know that we won't refresh it later

    const tiersClient = new PricingTiersClient(
      of(pricingResponse.tiers),
      new ProductFeaturesRegistry(pricingResponse.product_features)
    );

    return {
      isFeatureAvailable: tiersClient.isFeatureAvailable,
    };
  }
}
