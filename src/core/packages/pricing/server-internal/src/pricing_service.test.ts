/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { mockRouter, RouterMock } from '@kbn/core-http-router-server-mocks';
import {
  httpServiceMock,
  InternalHttpServicePrebootMock,
  InternalHttpServiceSetupMock,
} from '@kbn/core-http-server-mocks';
import { Observable, of } from 'rxjs';
import { PricingService } from './pricing_service';
import type { PricingConfigType } from './pricing_config';
import type { PricingProductFeature } from '@kbn/core-pricing-common';
import { analyticsServiceMock } from '@kbn/core/server/mocks';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { AsyncReturnType } from 'type-fest';

describe('PricingService', () => {
  let prebootHttp: InternalHttpServicePrebootMock;
  let setupHttp: InternalHttpServiceSetupMock;
  let service: PricingService;
  let router: RouterMock;
  let mockConfig: PricingConfigType;

  beforeEach(() => {
    prebootHttp = httpServiceMock.createInternalPrebootContract();
    setupHttp = httpServiceMock.createInternalSetupContract();
    router = mockRouter.create();
    setupHttp.createRouter.mockReturnValue(router);

    mockConfig = {
      tiers: {
        enabled: true,
        products: [
          { name: 'observability', tier: 'complete' },
          { name: 'security', tier: 'essentials' },
        ],
      },
    };

    const coreContext = mockCoreContext.create();
    // Mock the config service to return our test config
    coreContext.configService.atPath.mockReturnValue(of(mockConfig));

    service = new PricingService(coreContext);
  });

  describe('#preboot()', () => {
    it('registers the pricing routes with default config', () => {
      service.preboot({ http: prebootHttp });

      // Preboot uses default config, not the loaded config
      const expectedDefaultConfig = { tiers: { enabled: false, products: [] } };
      expect((service as any).pricingConfig$.value).toEqual(expectedDefaultConfig);

      // Verify that routes are registered on the preboot HTTP service
      expect(prebootHttp.registerRoutes).toHaveBeenCalledWith('', expect.any(Function));
    });
  });

  describe('#setup()', () => {
    let analyticsSetupMock: jest.Mocked<AnalyticsServiceSetup>;

    beforeEach(() => {
      service.preboot({ http: prebootHttp });
      analyticsSetupMock = analyticsServiceMock.createAnalyticsServiceSetup();
    });

    it('registers the analytics context provider', async () => {
      await service.setup({ analytics: analyticsSetupMock, http: setupHttp });

      expect(analyticsSetupMock.registerContextProvider).toHaveBeenCalledTimes(1);
      expect(analyticsSetupMock.registerContextProvider.mock.calls[0][0]).toMatchInlineSnapshot(
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

    it('registers the pricing routes', async () => {
      await service.setup({ analytics: analyticsSetupMock, http: setupHttp });

      expect(setupHttp.createRouter).toHaveBeenCalledWith('');
      expect(router.get).toHaveBeenCalledTimes(1);
      expect(router.get).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/internal/core/pricing',
          security: expect.objectContaining({
            authz: expect.objectContaining({
              enabled: false,
            }),
          }),
        }),
        expect.any(Function)
      );
    });

    it('allows registering product features', async () => {
      const setup = await service.setup({ analytics: analyticsSetupMock, http: setupHttp });

      const mockFeatures: PricingProductFeature[] = [
        {
          id: 'feature1',
          description: 'A feature',
          products: [{ name: 'observability', tier: 'complete' }],
        },
        {
          id: 'feature2',
          description: 'Another feature',
          products: [{ name: 'security', tier: 'essentials' }],
        },
      ];

      setup.registerProductFeatures(mockFeatures);

      // Verify the service has the features registered
      const registry = (service as any).productFeaturesRegistry;
      expect(registry.get('feature1')).toBeDefined();
      expect(registry.get('feature2')).toBeDefined();
    });
  });

  describe('#start()', () => {
    let setup: AsyncReturnType<PricingService['setup']>;

    beforeEach(async () => {
      service.preboot({ http: prebootHttp });
      const analyticsSetupMock = analyticsServiceMock.createAnalyticsServiceSetup();
      setup = await service.setup({ analytics: analyticsSetupMock, http: setupHttp });
    });

    it('returns a PricingTiersClient with the configured tiers', async () => {
      const start = service.start();

      expect(start).toHaveProperty('isFeatureAvailable');
    });

    it('returns a PricingTiersClient that can check feature availability', async () => {
      const mockFeatures: PricingProductFeature[] = [
        {
          id: 'feature1',
          description: 'A feature',
          products: [{ name: 'observability', tier: 'complete' }],
        },
      ];

      setup.registerProductFeatures(mockFeatures);
      const start = service.start();

      // Since our mock config has observability product enabled, this feature should be available
      expect(start.isFeatureAvailable('feature1')).toBe(true);
    });
  });
});
