/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PricingTiersClient } from './pricing_tiers_client';
import { ProductFeaturesRegistry } from './product_features_registry';
import type { PricingProductFeature } from './types';
import type { TiersConfig } from './pricing_tiers_config';

describe('PricingTiersClient', () => {
  let productFeaturesRegistry: ProductFeaturesRegistry;
  let tiersConfig: TiersConfig;
  let client: PricingTiersClient;

  beforeEach(() => {
    productFeaturesRegistry = new ProductFeaturesRegistry();
  });

  describe('isFeatureAvailable', () => {
    describe('when tiers are disabled', () => {
      beforeEach(() => {
        tiersConfig = {
          enabled: false,
          products: undefined,
        };
        client = new PricingTiersClient(tiersConfig, productFeaturesRegistry);
      });

      it('returns true for any feature, even if it does not exist', () => {
        expect(client.isFeatureAvailable('non-existent-feature')).toBe(true);
      });

      it('returns true for registered features indipendently of the tier configuration', () => {
        const feature: PricingProductFeature = {
          id: 'test-feature',
          description: 'A test feature for observability',
          products: [{ name: 'observability', tier: 'complete' }],
        };
        productFeaturesRegistry.register(feature);

        expect(client.isFeatureAvailable('test-feature')).toBe(true);
      });
    });

    describe('when tiers are enabled', () => {
      beforeEach(() => {
        tiersConfig = {
          enabled: true,
          products: [
            { name: 'observability', tier: 'complete' },
            { name: 'security', tier: 'essentials' },
          ],
        };
        client = new PricingTiersClient(tiersConfig, productFeaturesRegistry);
      });

      it('returns false for non-existent features', () => {
        expect(client.isFeatureAvailable('non-existent-feature')).toBe(false);
      });

      it('returns true when a feature has a matching active product', () => {
        const feature: PricingProductFeature = {
          id: 'observability-feature',
          description: 'A feature for observability products',
          products: [{ name: 'observability', tier: 'complete' }],
        };
        productFeaturesRegistry.register(feature);

        expect(client.isFeatureAvailable('observability-feature')).toBe(true);
      });

      it('returns false when a feature has no matching active products', () => {
        const feature: PricingProductFeature = {
          id: 'cloud-feature',
          description: 'A feature for cloud products',
          products: [{ name: 'cloud', tier: 'complete' }],
        };
        productFeaturesRegistry.register(feature);

        expect(client.isFeatureAvailable('cloud-feature')).toBe(false);
      });

      it('returns true when at least one product in a feature matches an active product', () => {
        const feature: PricingProductFeature = {
          id: 'mixed-feature',
          description: 'A feature available in multiple products',
          products: [
            { name: 'cloud', tier: 'complete' },
            { name: 'security', tier: 'essentials' },
          ],
        };
        productFeaturesRegistry.register(feature);

        expect(client.isFeatureAvailable('mixed-feature')).toBe(true);
      });

      it('checks for exact product matches including tier', () => {
        const feature: PricingProductFeature = {
          id: 'tier-mismatch-feature',
          description: 'A feature with tier requirements',
          products: [{ name: 'security', tier: 'complete' }], // Note: tier is 'complete' but active product has 'essentials'
        };
        productFeaturesRegistry.register(feature);

        expect(client.isFeatureAvailable('tier-mismatch-feature')).toBe(false);
      });
    });
  });
  describe('product', () => {
    describe('when tiers are disabled', () => {
      it('returns undefined when no products are configured', () => {
        tiersConfig = {
          enabled: false,
          products: undefined,
        };
        client = new PricingTiersClient(tiersConfig, productFeaturesRegistry);
        expect(client.product()).toBeUndefined();
      });
      it('returns undefined when products are an empty array', () => {
        tiersConfig = {
          enabled: false,
          products: [],
        };
        client = new PricingTiersClient(tiersConfig, productFeaturesRegistry);
        expect(client.product()).toBeUndefined();
      });
      it('returns undefined when products are configured but pricing tiers are disabled', () => {
        tiersConfig = {
          enabled: false,
          products: [{ name: 'observability', tier: 'complete' }],
        };
        client = new PricingTiersClient(tiersConfig, productFeaturesRegistry);
        expect(client.product()).toBeUndefined();
      });
    });
    describe('when tiers are enabled', () => {
      beforeEach(() => {
        tiersConfig = {
          enabled: true,
          products: [{ name: 'observability', tier: 'complete' }],
        };
        client = new PricingTiersClient(tiersConfig, productFeaturesRegistry);
      });
      it('returns the current active product', () => {
        // Note this test and implementation assumes only one product is active at a time
        expect(client.product()).toEqual({ name: 'observability', tier: 'complete' });
      });
    });
  });
});
