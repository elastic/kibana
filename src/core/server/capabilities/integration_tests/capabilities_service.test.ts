/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import supertest from 'supertest';
import { REPO_ROOT } from '@kbn/dev-utils';
import { HttpService, InternalHttpServiceSetup } from '../../http';
import { contextServiceMock } from '../../context/context_service.mock';
import { loggingSystemMock } from '../../logging/logging_system.mock';
import { Env } from '../../config';
import { getEnvOptions } from '../../config/mocks';
import { CapabilitiesService, CapabilitiesSetup } from '..';
import { createHttpServer } from '../../http/test_utils';

const coreId = Symbol('core');

const env = Env.createDefault(REPO_ROOT, getEnvOptions());

describe('CapabilitiesService', () => {
  let server: HttpService;
  let httpSetup: InternalHttpServiceSetup;

  let service: CapabilitiesService;
  let serviceSetup: CapabilitiesSetup;

  beforeEach(async () => {
    server = createHttpServer();
    httpSetup = await server.setup({
      context: contextServiceMock.createSetupContract(),
    });
    service = new CapabilitiesService({
      coreId,
      env,
      logger: loggingSystemMock.create(),
      configService: {} as any,
    });
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
