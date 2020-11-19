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

import { loggingSystemMock } from '../../../../../core/server/mocks';
import { setupServer } from '../../../../../core/server/test_utils';
import { setupDisplayInsecureClusterAlertRoute } from '../display_insecure_cluster_alert';
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
}

describe('GET /internal/security_oss/display_insecure_cluster_alert', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];

  const setupTestServer = async ({
    config = { showInsecureClusterWarning: true },
    displayModifier$ = new BehaviorSubject<boolean>(true),
    doesClusterHaveUserData = jest.fn().mockResolvedValue(true),
  }: SetupOpts) => {
    ({ server, httpSetup } = await setupServer(pluginId));

    const router = httpSetup.createRouter('/');
    const log = loggingSystemMock.createLogger();

    setupDisplayInsecureClusterAlertRoute({
      router,
      log,
      config$: of(config),
      displayModifier$,
      doesClusterHaveUserData,
    });

    await server.start();

    return {
      log,
    };
  };

  afterEach(async () => {
    await server.stop();
  });

  it('responds `false` if plugin is not configured to display alerts', async () => {
    await setupTestServer({
      config: { showInsecureClusterWarning: false },
    });

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/display_insecure_cluster_alert')
      .expect(200, { displayAlert: false });
  });

  it('responds `false` if cluster does not contain user data', async () => {
    await setupTestServer({
      config: { showInsecureClusterWarning: true },
      doesClusterHaveUserData: jest.fn().mockResolvedValue(false),
    });

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/display_insecure_cluster_alert')
      .expect(200, { displayAlert: false });
  });

  it('responds `false` if displayModifier$ is set to false', async () => {
    await setupTestServer({
      config: { showInsecureClusterWarning: true },
      doesClusterHaveUserData: jest.fn().mockResolvedValue(true),
      displayModifier$: new BehaviorSubject<boolean>(false),
    });

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/display_insecure_cluster_alert')
      .expect(200, { displayAlert: false });
  });

  it('responds `true` if cluster contains user data', async () => {
    await setupTestServer({
      config: { showInsecureClusterWarning: true },
      doesClusterHaveUserData: jest.fn().mockResolvedValue(true),
    });

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/display_insecure_cluster_alert')
      .expect(200, { displayAlert: true });
  });

  it('responds to changing displayModifier$ values', async () => {
    const displayModifier$ = new BehaviorSubject<boolean>(true);

    await setupTestServer({
      config: { showInsecureClusterWarning: true },
      doesClusterHaveUserData: jest.fn().mockResolvedValue(true),
      displayModifier$,
    });

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/display_insecure_cluster_alert')
      .expect(200, { displayAlert: true });

    displayModifier$.next(false);

    await supertest(httpSetup.server.listener)
      .get('/internal/security_oss/display_insecure_cluster_alert')
      .expect(200, { displayAlert: false });
  });
});
