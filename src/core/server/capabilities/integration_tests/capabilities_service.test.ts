/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import supertest from 'supertest';
import { HttpService, InternalHttpServiceSetup } from '../../http';
import { contextServiceMock } from '../../context/context_service.mock';
import { loggingServiceMock } from '../../logging/logging_service.mock';
import { Env } from '../../config';
import { getEnvOptions } from '../../config/__mocks__/env';
import { CapabilitiesService, CapabilitiesSetup } from '..';
import { createHttpServer } from '../../http/test_utils';

const coreId = Symbol('core');
const env = Env.createDefault(getEnvOptions());

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
      logger: loggingServiceMock.create(),
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

    it('uses the service capabilities providers', async () => {
      serviceSetup.registerProvider(() => ({
        catalogue: {
          something: true,
        },
      }));

      const result = await supertest(httpSetup.server.listener)
        .post('/api/core/capabilities')
        .send({ applications: [] })
        .expect(200);
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
