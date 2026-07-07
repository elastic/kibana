/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core-http-server';
import type { GetPricingResponse, ProductFeaturesRegistry } from '@kbn/core-pricing-common';
import type { PricingConfigType } from '../pricing_config';

export function registerPricingRoutes(
  router: IRouter,
  params: {
    pricingConfig: PricingConfigType;
    productFeaturesRegistry: ProductFeaturesRegistry;
  }
) {
  router.get(
    {
      path: '/internal/core/pricing',
      security: {
        authz: {
          enabled: false,
          reason:
            'Pricing information does not require authorization and should be always accessible.',
        },
      },
      options: { access: 'internal' },
      validate: false,
    },
    async (_context, _req, res) => {
      return res.ok<GetPricingResponse>({
        body: {
          tiers: params.pricingConfig.tiers,
          product_features: params.productFeaturesRegistry.asObject(),
        },
      });
    }
  );
}
