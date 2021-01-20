/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
