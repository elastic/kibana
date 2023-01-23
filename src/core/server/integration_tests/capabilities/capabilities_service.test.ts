/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { REPO_ROOT } from '@kbn/repo-info';
import { Env } from '@kbn/config';
import { getEnvOptions } from '@kbn/config-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { contextServiceMock } from '@kbn/core-http-context-server-mocks';
import {
  HttpService,
  InternalHttpServicePreboot,
  InternalHttpServiceSetup,
} from '@kbn/core-http-server-internal';
import { createHttpServer } from '@kbn/core-http-server-mocks';
import type { CapabilitiesSetup } from '@kbn/core-capabilities-server';
import { CapabilitiesService } from '@kbn/core-capabilities-server-internal';

const coreId = Symbol('core');

const env = Env.createDefault(REPO_ROOT, getEnvOptions());

describe('CapabilitiesService', () => {
  let server: HttpService;
  let httpPreboot: InternalHttpServicePreboot;
  let httpSetup: InternalHttpServiceSetup;

  let service: CapabilitiesService;
  let serviceSetup: CapabilitiesSetup;

  beforeEach(async () => {
    server = createHttpServer();
    httpPreboot = await server.preboot({ context: contextServiceMock.createPrebootContract() });
    httpSetup = await server.setup({
      context: contextServiceMock.createSetupContract(),
      executionContext: executionContextServiceMock.createInternalSetupContract(),
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
      serviceSetup.registerSwitcher(switcher);

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
      serviceSetup.registerSwitcher(switcher);

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
