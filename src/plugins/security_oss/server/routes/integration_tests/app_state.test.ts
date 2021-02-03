/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { loggingSystemMock } from '../../../../../core/server/mocks';
import { setupServer } from '../../../../../core/server/test_utils';
import { AnonymousAccessService } from '../../plugin';
import { setupAppStateRoute } from '../app_state';
import { ConfigType } from '../../config';
import { BehaviorSubject, of } from 'rxjs';
import { UnwrapPromise } from '@kbn/utility-types';
import { createClusterDataCheck } from '../../check_cluster_data';
import supertest from 'supertest';

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;
const pluginId = Symbol('securityOss');

interface SetupOpts {
  config?: ConfigType;
  displayModifier$?: BehaviorSubject<boolean>;
  doesClusterHaveUserData?: ReturnType<typeof createClusterDataCheck>;
  getAnonymousAccessService?: () => AnonymousAccessService | null;
}

describe('GET /internal/security_oss/app_state', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];

  const setupTestServer = async ({
    config = { showInsecureClusterWarning: true },
    displayModifier$ = new BehaviorSubject<boolean>(true),
    doesClusterHaveUserData = jest.fn().mockResolvedValue(true),
    getAnonymousAccessService = () => null,
  }: SetupOpts) => {
    ({ server, httpSetup } = await setupServer(pluginId));

    const router = httpSetup.createRouter('/');
    const log = loggingSystemMock.createLogger();

    setupAppStateRoute({
      router,
      log,
      config$: of(config),
      displayModifier$,
      doesClusterHaveUserData,
      getAnonymousAccessService,
    });

    await server.start();

    return {
      log,
    };
  };

  afterEach(async () => {
    await server.stop();
  });

  it('responds `insecureClusterAlert.displayAlert == false` if plugin is not configured to display alerts', async () => {
    await setupTestServer({
      config: { showInsecureClusterWarning: false },
    });

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/app_state')
      .expect(200, {
        insecureClusterAlert: { displayAlert: false },
        anonymousAccess: { isEnabled: false, accessURLParameters: null },
      });
  });

  it('responds `insecureClusterAlert.displayAlert == false` if cluster does not contain user data', async () => {
    await setupTestServer({
      config: { showInsecureClusterWarning: true },
      doesClusterHaveUserData: jest.fn().mockResolvedValue(false),
    });

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/app_state')
      .expect(200, {
        insecureClusterAlert: { displayAlert: false },
        anonymousAccess: { isEnabled: false, accessURLParameters: null },
      });
  });

  it('responds `insecureClusterAlert.displayAlert == false` if displayModifier$ is set to false', async () => {
    await setupTestServer({
      config: { showInsecureClusterWarning: true },
      doesClusterHaveUserData: jest.fn().mockResolvedValue(true),
      displayModifier$: new BehaviorSubject<boolean>(false),
    });

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/app_state')
      .expect(200, {
        insecureClusterAlert: { displayAlert: false },
        anonymousAccess: { isEnabled: false, accessURLParameters: null },
      });
  });

  it('responds `insecureClusterAlert.displayAlert == true` if cluster contains user data', async () => {
    await setupTestServer({
      config: { showInsecureClusterWarning: true },
      doesClusterHaveUserData: jest.fn().mockResolvedValue(true),
    });

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/app_state')
      .expect(200, {
        insecureClusterAlert: { displayAlert: true },
        anonymousAccess: { isEnabled: false, accessURLParameters: null },
      });
  });

  it('responds to changing displayModifier$ values', async () => {
    const displayModifier$ = new BehaviorSubject<boolean>(true);

    await setupTestServer({
      config: { showInsecureClusterWarning: true },
      doesClusterHaveUserData: jest.fn().mockResolvedValue(true),
      displayModifier$,
    });

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/app_state')
      .expect(200, {
        insecureClusterAlert: { displayAlert: true },
        anonymousAccess: { isEnabled: false, accessURLParameters: null },
      });

    displayModifier$.next(false);

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/app_state')
      .expect(200, {
        insecureClusterAlert: { displayAlert: false },
        anonymousAccess: { isEnabled: false, accessURLParameters: null },
      });
  });

  it('returns anonymous access state if anonymous access service is provided', async () => {
    const displayModifier$ = new BehaviorSubject<boolean>(true);

    await setupTestServer({
      config: { showInsecureClusterWarning: true },
      doesClusterHaveUserData: jest.fn().mockResolvedValue(true),
      displayModifier$,
      getAnonymousAccessService: () => ({
        isAnonymousAccessEnabled: true,
        accessURLParameters: new Map([['auth_provider_hint', 'anonymous1']]),
        getCapabilities: jest.fn(),
      }),
    });

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/app_state')
      .expect(200, {
        insecureClusterAlert: { displayAlert: true },
        anonymousAccess: {
          isEnabled: true,
          accessURLParameters: { auth_provider_hint: 'anonymous1' },
        },
      });

    displayModifier$.next(false);

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/app_state')
      .expect(200, {
        insecureClusterAlert: { displayAlert: false },
        anonymousAccess: {
          isEnabled: true,
          accessURLParameters: { auth_provider_hint: 'anonymous1' },
        },
      });
  });
});
