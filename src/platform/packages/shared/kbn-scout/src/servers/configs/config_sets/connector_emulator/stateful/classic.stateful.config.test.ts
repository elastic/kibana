/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import {
  EMULATOR_CA_DIR_ENV,
  EMULATOR_HOST_ENV,
  EMULATOR_PORT_ENV,
  resolveEmulatorLocation,
} from '@kbn/connector-emulate';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

const loadServers = (env: Record<string, string> = {}): ScoutServerConfig => {
  let servers: ScoutServerConfig | undefined;
  jest.isolateModules(() => {
    Object.assign(process.env, env);
    ({ servers } = jest.requireActual('./classic.stateful.config'));
  });
  if (!servers) {
    throw new Error('classic.stateful.config failed to load');
  }
  return servers;
};

describe('connector_emulator config set', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    for (const name of [EMULATOR_HOST_ENV, EMULATOR_PORT_ENV, EMULATOR_CA_DIR_ENV]) {
      delete process.env[name];
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('sends Kibana through the emulator, and trusts its CA, where the emulator keeps them', () => {
    const { proxyUrl, caCertFile } = resolveEmulatorLocation({ repoRoot: REPO_ROOT });
    const { kbnTestServer } = loadServers();

    expect(kbnTestServer.serverArgs).toContain(`--xpack.actions.proxyUrl=${proxyUrl}`);
    expect(kbnTestServer.env).toEqual(expect.objectContaining({ NODE_EXTRA_CA_CERTS: caCertFile }));
    expect(proxyUrl).toBe('http://127.0.0.1:5690');
    expect(caCertFile).toBe(path.join(REPO_ROOT, 'data', 'connector_emulate', 'ca.crt'));
  });

  it('follows the environment the emulator is moved with', () => {
    const { kbnTestServer } = loadServers({
      [EMULATOR_PORT_ENV]: '6001',
      [EMULATOR_CA_DIR_ENV]: 'target/emulator_ca',
    });

    expect(kbnTestServer.serverArgs).toContain('--xpack.actions.proxyUrl=http://127.0.0.1:6001');
    expect(kbnTestServer.env.NODE_EXTRA_CA_CERTS).toBe(
      path.join(REPO_ROOT, 'target', 'emulator_ca', 'ca.crt')
    );
  });

  it('changes nothing else about the default servers', () => {
    const servers = loadServers();

    expect(servers.esTestCluster).toEqual(defaultConfig.esTestCluster);
    expect(servers.servers).toEqual(defaultConfig.servers);
    expect(servers.kbnTestServer.serverArgs.slice(0, -1)).toEqual(
      defaultConfig.kbnTestServer.serverArgs
    );
  });
});
