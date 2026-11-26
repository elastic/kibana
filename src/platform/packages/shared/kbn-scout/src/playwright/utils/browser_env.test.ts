/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBrowserEnvWithoutProxy } from './browser_env';

const PROXY_ENV_VARS = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
];
const MANAGED_ENV_VARS = ['USE_CITADEL_PROXY', 'NO_PROXY', ...PROXY_ENV_VARS];
const PROXY_URL = 'http://job:token@proxy.test:3128';

describe('getBrowserEnvWithoutProxy', () => {
  // The test's own CI job sets these when it runs behind the Citadel proxy.
  const originalEnv = new Map(MANAGED_ENV_VARS.map((name) => [name, process.env[name]]));

  beforeEach(() => {
    for (const name of MANAGED_ENV_VARS) {
      delete process.env[name];
    }
  });

  afterAll(() => {
    for (const [name, value] of originalEnv) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it('returns undefined when the build does not use the Citadel proxy', () => {
    process.env.HTTPS_PROXY = PROXY_URL;
    expect(getBrowserEnvWithoutProxy()).toBeUndefined();
  });

  it('returns undefined for USE_CITADEL_PROXY values other than true', () => {
    process.env.USE_CITADEL_PROXY = 'false';
    process.env.HTTPS_PROXY = PROXY_URL;
    expect(getBrowserEnvWithoutProxy()).toBeUndefined();
  });

  it('removes every proxy variable and keeps the rest', () => {
    process.env.USE_CITADEL_PROXY = 'true';
    process.env.NO_PROXY = 'localhost,127.0.0.1';
    for (const name of PROXY_ENV_VARS) {
      process.env[name] = PROXY_URL;
    }

    const env = getBrowserEnvWithoutProxy();

    for (const name of PROXY_ENV_VARS) {
      expect(env).not.toHaveProperty(name);
    }
    expect(env).toMatchObject({ USE_CITADEL_PROXY: 'true', NO_PROXY: 'localhost,127.0.0.1' });
  });

  it('reads the given environment instead of process.env', () => {
    const env = getBrowserEnvWithoutProxy({
      USE_CITADEL_PROXY: 'true',
      HTTPS_PROXY: PROXY_URL,
      PATH: '/usr/bin',
    });

    expect(env).toEqual({ USE_CITADEL_PROXY: 'true', PATH: '/usr/bin' });
  });
});
