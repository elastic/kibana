/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { REPO_ROOT } from '@kbn/repo-info';
import { Env } from '@kbn/config';
import { getEnvOptions } from '@kbn/config-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { userActivityServiceMock } from '@kbn/core-user-activity-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { createConfigService } from '@kbn/core-http-server-mocks';
import type {
  HttpService,
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import { PricingService } from '@kbn/core-pricing-server-internal';
import type { PricingProductFeature, IPricingProduct } from '@kbn/core-pricing-common';
import { createInternalHttpService } from '../utilities';

const coreId = Symbol('core');

const env = Env.createDefault(REPO_ROOT, getEnvOptions());

const configService = createConfigService();

describe('PricingService', () => {
  let server: HttpService;
  let httpPreboot: InternalHttpServicePreboot;
  let httpSetup: InternalHttpServiceSetup;

  let service: PricingService;
  let serviceSetup: Awaited<ReturnType<PricingService['setup']>>;

  describe('preboot', () => {
    beforeAll(async () => {
      server = createInternalHttpService();
      httpPreboot = await server.preboot({
        context: contextServiceMock.createPrebootContract(),
        docLinks: docLinksServiceMock.createSetupContract(),
      });
      httpSetup = await server.setup({
        context: contextServiceMock.createSetupContract(),
        executionContext: executionContextServiceMock.createInternalSetupContract(),
        userActivity: userActivityServiceMock.createInternalSetupContract(),
      });
      service = new PricingService({
        coreId,
        env,
        logger: loggingSystemMock.create(),
        configService,
      });
      await service.preboot({ http: httpPreboot });
    });

    afterAll(async () => {
      await server.stop();
    });

    describe('/internal/core/pricing route', () => {
      it('is exposed and returns pricing configuration', async () => {
        const result = await supertest(httpPreboot.server.listener)
          .get('/internal/core/pricing')
          .expect(200);

        expect(result.body).toHaveProperty('tiers');
        expect(result.body).toHaveProperty('product_features');
        expect(typeof result.body.tiers).toBe('object');
        expect(typeof result.body.product_features).toBe('object');
      });
    });
  });

  describe('after preboot', () => {
    beforeAll(async () => {
      server = createInternalHttpService();
      httpPreboot = await server.preboot({
        context: contextServiceMock.createPrebootContract(),
        docLinks: docLinksServiceMock.createSetupContract(),
      });
      httpSetup = await server.setup({
        context: contextServiceMock.createSetupContract(),
        executionContext: executionContextServiceMock.createInternalSetupContract(),
        userActivity: userActivityServiceMock.createInternalSetupContract(),
      });
      service = new PricingService({
        coreId,
        env,
        logger: loggingSystemMock.create(),
        configService,
      });
      await service.preboot({ http: httpPreboot });
      serviceSetup = await service.setup({ http: httpSetup });
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    describe('/internal/core/pricing route', () => {
      it('is exposed and returns pricing configuration', async () => {
        const result = await supertest(httpSetup.server.listener)
          .get('/internal/core/pricing')
          .expect(200);

        expect(result.body).toHaveProperty('tiers');
        expect(result.body).toHaveProperty('product_features');
        expect(typeof result.body.tiers).toBe('object');
        expect(typeof result.body.product_features).toBe('object');
      });

      it('returns default pricing configuration when no custom config is provided', async () => {
        const result = await supertest(httpSetup.server.listener)
          .get('/internal/core/pricing')
          .expect(200);

        expect(result.body).toMatchInlineSnapshot(`
        Object {
          "product_features": Object {},
          "tiers": Object {
            "enabled": true,
            "products": Array [],
          },
        }
      `);
      });

      it('includes registered product features in the response', async () => {
        // Register a product feature
        const testFeature: PricingProductFeature = {
          id: 'test_feature',
          description: 'A test feature for integration testing',
          products: [
            { name: 'observability', tier: 'complete' },
            { name: 'security', tier: 'essentials' },
          ] as IPricingProduct[],
        };

        serviceSetup.registerProductFeatures([testFeature]);

        const result = await supertest(httpSetup.server.listener)
          .get('/internal/core/pricing')
          .expect(200);

        expect(result.body.product_features).toHaveProperty('test_feature');
        expect(result.body.product_features.test_feature).toEqual(testFeature);
      });

      it('handles multiple registered product features', async () => {
        const feature1: PricingProductFeature = {
          id: 'feature_1',
          description: 'First test feature',
          products: [
            { name: 'observability', tier: 'complete' },
            { name: 'security', tier: 'essentials' },
          ] as IPricingProduct[],
        };

        const feature2: PricingProductFeature = {
          id: 'feature_2',
          description: 'Second test feature',
          products: [
            {
              name: 'security',
              tier: 'complete',
            },
          ] as IPricingProduct[],
        };

        serviceSetup.registerProductFeatures([feature1, feature2]);

        const result = await supertest(httpSetup.server.listener)
          .get('/internal/core/pricing')
          .expect(200);

        expect(result.body.product_features).toHaveProperty('feature_1');
        expect(result.body.product_features).toHaveProperty('feature_2');
        expect(result.body.product_features.feature_1).toEqual(feature1);
        expect(result.body.product_features.feature_2).toEqual(feature2);
      });
    });
  });
});
