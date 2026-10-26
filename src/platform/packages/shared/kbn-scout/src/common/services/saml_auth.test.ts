/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SamlSessionManager } from '@kbn/test-saml-auth';
import type { ScoutTestConfig } from '../../types';
import type { ScoutLogger } from './logger';
import { createSamlSessionManager } from './saml_auth';

jest.mock('@kbn/test-saml-auth', () => ({
  SamlSessionManager: jest.fn(),
}));

const SamlSessionManagerMock = SamlSessionManager as unknown as jest.Mock;

const log = { serviceLoaded: jest.fn() } as unknown as ScoutLogger;

const echConfig: ScoutTestConfig = {
  serverless: false,
  isCloud: true,
  http2: false,
  uiam: false,
  license: 'trial',
  cloudHostName: 'qa.elastic-cloud.com',
  cloudUsersFilePath: '/secrets/role_users.json',
  hosts: {
    kibana: 'https://my.deployment.kb.co',
    elasticsearch: 'https://my.deployment.es.co',
  },
  auth: { username: 'elastic', password: 'changeme' },
};

describe('createSamlSessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it(`routes the worker's custom role through the custom SAML provider`, () => {
    createSamlSessionManager(
      { ...echConfig, customSamlProviderName: 'qaf' },
      log,
      'custom_role_worker_1'
    );

    expect(SamlSessionManagerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customSamlRealm: { providerName: 'qaf', roles: ['custom_role_worker_1'] },
      })
    );
  });

  it(`doesn't set a custom SAML realm when the config has no provider`, () => {
    createSamlSessionManager(echConfig, log, 'custom_role_worker_1');

    expect(SamlSessionManagerMock.mock.calls[0][0].customSamlRealm).toBeUndefined();
  });

  it(`doesn't set a custom SAML realm without a custom role name`, () => {
    createSamlSessionManager({ ...echConfig, customSamlProviderName: 'qaf' }, log);

    expect(SamlSessionManagerMock.mock.calls[0][0].customSamlRealm).toBeUndefined();
  });
});
