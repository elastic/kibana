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
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';
import { userActivityServiceMock } from '@kbn/core-user-activity-server-mocks';
import type { CapabilitiesSetup } from '@kbn/core-capabilities-server';
import { CapabilitiesService } from '@kbn/core-capabilities-server-internal';
import type {
  HttpService,
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import { createInternalHttpService } from '../utilities';

const coreId = Symbol('core');

const env = Env.createDefault(REPO_ROOT, getEnvOptions());

describe('CapabilitiesService', () => {
  let server: HttpService;
  let httpPreboot: InternalHttpServicePreboot;
  let httpSetup: InternalHttpServiceSetup;

  let service: CapabilitiesService;
  let serviceSetup: CapabilitiesSetup;

  beforeEach(async () => {
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
    service = new CapabilitiesService({
      coreId,
      env,
      logger: loggingSystemMock.create(),
      configService: {} as any,
    });
    await service.preboot({ http: httpPreboot });
    serviceSetup = await service.setup({ http: httpSetup });
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('/api/core/capabilities route', () => {
    it('is exposed', async () => {
      const result = await supertest(httpSetup.server.listener)
        .post('/api/core/capabilities')
        .send({ applications: [] })
        .expect(200);
      expect(result.body).toMatchInlineSnapshot(`
              Object {
                "catalogue": Object {},
                "management": Object {},
                "navLinks": Object {},
              }
          `);
    });

    it('uses the service capabilities providers and switchers', async () => {
      const getInitialCapabilities = () => ({
        catalogue: {
          something: true,
        },
        management: {},
        navLinks: {},
      });
      serviceSetup.registerProvider(() => getInitialCapabilities());

      const switcher = jest.fn((_, capabilities) => capabilities);
      serviceSetup.registerSwitcher(switcher, { capabilityPath: '*' });

      const result = await supertest(httpSetup.server.listener)
        .post('/api/core/capabilities')
        .send({ applications: [] })
        .expect(200);

      expect(switcher).toHaveBeenCalledTimes(1);
      expect(switcher).toHaveBeenCalledWith(expect.anything(), getInitialCapabilities(), false);
      expect(result.body).toMatchInlineSnapshot(`
        Object {
          "catalogue": Object {
            "something": true,
          },
          "management": Object {},
          "navLinks": Object {},
        }
      `);
    });

    it('passes useDefaultCapabilities to registered switchers', async () => {
      const getInitialCapabilities = () => ({
        catalogue: {
          something: true,
        },
        management: {},
        navLinks: {},
      });
      serviceSetup.registerProvider(() => getInitialCapabilities());

      const switcher = jest.fn((_, capabilities) => capabilities);
      serviceSetup.registerSwitcher(switcher, { capabilityPath: '*' });

      const result = await supertest(httpSetup.server.listener)
        .post('/api/core/capabilities?useDefaultCapabilities=true')
        .send({ applications: [] })
        .expect(200);

      expect(switcher).toHaveBeenCalledTimes(1);
      expect(switcher).toHaveBeenCalledWith(expect.anything(), getInitialCapabilities(), true);
      expect(result.body).toMatchInlineSnapshot(`
        Object {
          "catalogue": Object {
            "something": true,
          },
          "management": Object {},
          "navLinks": Object {},
        }
      `);
    });
  });
});
