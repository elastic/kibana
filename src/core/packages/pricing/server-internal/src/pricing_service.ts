/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext } from '@kbn/core-base-server-internal';
import type { Logger } from '@kbn/logging';
import { firstValueFrom } from 'rxjs';
import type { IConfigService } from '@kbn/config';
import {
  type PricingProductFeature,
  ProductFeaturesRegistry,
  PricingTiersClient,
} from '@kbn/core-pricing-common';
import type {
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import type { PricingConfigType } from './pricing_config';
import { registerRoutes } from './routes';

interface PrebootDeps {
  http: InternalHttpServicePreboot;
}

interface SetupDeps {
  http: InternalHttpServiceSetup;
}

/** @internal */
export class PricingService {
  private readonly configService: IConfigService;
  private readonly logger: Logger;
  private readonly productFeaturesRegistry: ProductFeaturesRegistry;
  private pricingConfig: PricingConfigType;

  constructor(core: CoreContext) {
    this.logger = core.logger.get('pricing-service');
    this.configService = core.configService;
    this.productFeaturesRegistry = new ProductFeaturesRegistry();
    this.pricingConfig = { tiers: { enabled: false, products: [] } };
  }

  public preboot({ http }: PrebootDeps) {
    this.logger.debug('Prebooting pricing service');

    // The preboot server has no need for real pricing.
    http.registerRoutes('', (router) => {
      registerRoutes(router, {
        pricingConfig: this.pricingConfig,
        productFeaturesRegistry: this.productFeaturesRegistry,
      });
    });
  }

  public async setup({ http }: SetupDeps) {
    this.logger.debug('Setting up pricing service');

    this.pricingConfig = await firstValueFrom(
      this.configService.atPath<PricingConfigType>('pricing')
    );

    registerRoutes(http.createRouter(''), {
      pricingConfig: this.pricingConfig,
      productFeaturesRegistry: this.productFeaturesRegistry,
    });

    return {
      registerProductFeatures: (features: PricingProductFeature[]) => {
        features.forEach((feature) => {
          this.productFeaturesRegistry.register(feature);
        });
      },
    };
  }

  public start() {
    const tiersClient = new PricingTiersClient(
      this.pricingConfig.tiers,
      this.productFeaturesRegistry
    );

    return {
      isFeatureAvailable: tiersClient.isFeatureAvailable,
    };
  }
}
