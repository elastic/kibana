/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceSetup as AnalyticsServiceSetupFromServer } from '@kbn/core-analytics-server';
import type { AnalyticsServiceSetup as AnalyticsServiceSetupFromBrowser } from '@kbn/core-analytics-browser';
import { map, type Observable } from 'rxjs';
import type { PricingConfigType } from '@kbn/core-pricing-server-internal';

export function registerAnalyticsContextProvider(
  analytics: AnalyticsServiceSetupFromServer | AnalyticsServiceSetupFromBrowser,
  pricingConfig$: Observable<PricingConfigType>
) {
  analytics.registerContextProvider({
    name: 'pricing',
    context$: pricingConfig$.pipe(
      map(({ tiers }) => ({
        pricing_tiers: tiers.products?.map(({ name, tier }) => `${name}-${tier}`),
      }))
    ),
    schema: {
      pricing_tiers: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description: 'Active pricing tier joined as `product_name-tier_name`',
          },
        },
        _meta: {
          description: 'List of active pricing tiers for products',
          optional: true,
        },
      },
    },
  });
}
