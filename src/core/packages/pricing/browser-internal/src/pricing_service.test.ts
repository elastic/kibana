/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { GetPricingResponse } from '@kbn/core-pricing-browser';
import { PricingService } from './pricing_service';
import { analyticsServiceMock } from '@kbn/core/public/mocks';
import { Observable } from 'rxjs';

describe('PricingService', () => {
  let service: PricingService;
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let mockPricingResponse: GetPricingResponse;

  beforeEach(() => {
    service = new PricingService();
    http = httpServiceMock.createStartContract();

    mockPricingResponse = {
      tiers: {
        enabled: true,
        products: [
          { name: 'observability', tier: 'complete' },
          { name: 'security', tier: 'essentials' },
        ],
      },
      product_features: {
        feature1: {
          id: 'feature1',
          description: 'A feature for observability products',
          products: [{ name: 'observability', tier: 'complete' }],
        },
        feature2: {
          id: 'feature2',
          description: 'A feature for security products',
          products: [{ name: 'security', tier: 'essentials' }],
        },
      },
    };

    http.get.mockResolvedValue(mockPricingResponse);
  });

  describe('#setup()', () => {
    it('registers the analytics context provider', () => {
      const analyticsMock = analyticsServiceMock.createAnalyticsServiceSetup();
      service.setup({ analytics: analyticsMock });

      expect(analyticsMock.registerContextProvider).toHaveBeenCalledTimes(1);
      expect(analyticsMock.registerContextProvider.mock.calls[0][0]).toMatchInlineSnapshot(
        {
          context$: expect.any(Observable),
        },
        `
        Object {
          "context$": Any<Observable>,
          "name": "pricing",
          "schema": Object {
            "pricing_tiers": Object {
              "_meta": Object {
                "description": "List of active pricing tiers for products",
                "optional": true,
              },
              "items": Object {
                "_meta": Object {
                  "description": "Active pricing tier joined as \`product_name-tier_name\`",
                },
                "type": "keyword",
              },
              "type": "array",
            },
          },
        }
      `
      );
    });
  });

  describe('#start()', () => {
    beforeEach(() => {
      const analyticsMock = analyticsServiceMock.createAnalyticsServiceSetup();
      service.setup({ analytics: analyticsMock });
    });

    it('fetches pricing data from the API', async () => {
      await service.start({ http });

      expect(http.get).toHaveBeenCalledWith('/internal/core/pricing');
    });

    it('returns a PricingTiersClient with the fetched data', async () => {
      const startContract = await service.start({ http });

      expect(startContract).toHaveProperty('isFeatureAvailable');
    });

    it('initializes the client with the correct tiers configuration', async () => {
      const startContract = await service.start({ http });

      // Since our mock has feature1 with observability product which is enabled in tiers
      expect(startContract.isFeatureAvailable('feature1')).toBe(true);
    });

    it('initializes the client with empty data when API returns empty response', async () => {
      const emptyResponse: GetPricingResponse = {
        tiers: {
          enabled: false,
          products: [],
        },
        product_features: {},
      };
      http.get.mockResolvedValue(emptyResponse);

      const startContract = await service.start({ http });

      // When tiers are disabled, all features should be available
      expect(startContract.isFeatureAvailable('any-feature')).toBe(true);
    });
  });
});
