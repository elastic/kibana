/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers } from './classic.stateful.config';

// Top-level imports evaluate the config chain once, with whatever GCS_CREDENTIALS the
// runner env happens to carry, writing a real SA key to a temp file during tests.
// Guard: when the env var is unset at load time no secure file may be produced.
const GCS_SETTING_PREFIX = 'gcs.client.default.credentials_file=';

describe('loads without GCS_CREDENTIALS', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GCS_CREDENTIALS;
  });
  afterEach(() => {
    process.env = originalEnv;
  });
  it('adds no GCS secure file', () => {
    let configServers: typeof import('./classic.stateful.config').servers | undefined;
    jest.isolateModules(() => {
      ({ servers: configServers } = jest.requireActual('./classic.stateful.config'));
    });
    expect(configServers?.esTestCluster.secureFiles ?? []).not.toContainEqual(
      expect.stringContaining(GCS_SETTING_PREFIX)
    );
  });
});

describe('evals_attack_discovery_fp_tp config set', () => {
  it('enables service accounts so alertzero installs its managed workflows (#295215)', () => {
    expect(servers.kbnTestServer.serverArgs).toContain(
      '--xpack.security.serviceAccounts.enabled=true'
    );
  });

  it('leaves Agent Builder experimental features at their default', () => {
    const experimentalArg = servers.kbnTestServer.serverArgs.find((arg) =>
      arg.startsWith('--uiSettings.overrides.agentBuilder:experimentalFeatures=true')
    );
    expect(experimentalArg).toBeUndefined();
  });
});
