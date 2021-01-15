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

import type { UnwrapPromise } from '@kbn/utility-types';
import supertest from 'supertest';
import { setupServer } from '../../../../../core/server/test_utils';
import { AnonymousAccessService } from '../../plugin';
import { setupAnonymousAccessCapabilitiesRoute } from '../anonymous_access_capabilities';

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;
const pluginId = Symbol('securityOss');

interface SetupOpts {
  getAnonymousAccessService?: () => AnonymousAccessService | null;
}

describe('GET /internal/security_oss/anonymous_access/capabilities', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];

  const setupTestServer = async ({ getAnonymousAccessService = () => null }: SetupOpts = {}) => {
    ({ server, httpSetup } = await setupServer(pluginId));

    const router = httpSetup.createRouter('/');

    setupAnonymousAccessCapabilitiesRoute({ router, getAnonymousAccessService });

    await server.start();
  };

  afterEach(async () => {
    await server.stop();
  });

  it('responds with 501 if anonymous access service is provided', async () => {
    await setupTestServer();

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/anonymous_access/capabilities')
      .expect(501, {
        statusCode: 501,
        error: 'Not Implemented',
        message: 'Not Implemented',
      });
  });

  it('returns anonymous access state if anonymous access service is provided', async () => {
    await setupTestServer({
      getAnonymousAccessService: () => ({
        isAnonymousAccessEnabled: true,
        accessURLParameters: new Map([['auth_provider_hint', 'anonymous1']]),
        getCapabilities: jest.fn().mockResolvedValue({
          navLinks: {},
          management: {},
          catalogue: {},
          custom: { something: true },
        }),
      }),
    });

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/anonymous_access/capabilities')
      .expect(200, {
        navLinks: {},
        management: {},
        catalogue: {},
        custom: { something: true },
      });
  });
});
