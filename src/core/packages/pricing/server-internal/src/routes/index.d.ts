import type { IRouter } from '@kbn/core-http-server';
import type { ProductFeaturesRegistry } from '@kbn/core-pricing-common';
import type { PricingConfigType } from '../pricing_config';
export declare function registerRoutes(router: IRouter, params: {
    pricingConfig: PricingConfigType;
    productFeaturesRegistry: ProductFeaturesRegistry;
}): void;
