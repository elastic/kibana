/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import type { ScoutServerConfig } from '../../../../../types';

const GCS_SETTING_PREFIX = 'gcs.client.default.credentials_file=';
// Synthetic, non-secret marker: never a real service-account key.
const SENTINEL_CREDENTIALS = '{"type":"synthetic-nonsecret-sentinel-4f9c2a"}';
const EXPERIMENTAL_FEATURES_ARG = '--uiSettings.overrides.agentBuilder:experimentalFeatures=true';

// Importing a config set evaluates `withEvalsTracing`, which writes `GCS_CREDENTIALS` to a temp file
// at module load. Nothing here imports a config statically: each test loads the chain inside
// `loadConfigs`, after the env has been set up, so the runner env never leaks a real key to disk.
interface LoadedConfigs {
  servers: ScoutServerConfig;
  personaMatrixConfig: ScoutServerConfig;
}

const loadConfigs = (): LoadedConfigs => {
  let loaded: LoadedConfigs | undefined;
  jest.isolateModules(() => {
    const { servers } = jest.requireActual('./classic.stateful.config');
    const { servers: personaMatrixConfig } = jest.requireActual(
      '../../evals_security_persona_matrix/stateful/classic.stateful.config'
    );
    loaded = { servers, personaMatrixConfig };
  });
  if (!loaded) throw new Error('evals_security_persona_matrix_parity config failed to load');
  return loaded;
};

const gcsSecureFiles = (config: ScoutServerConfig): string[] =>
  (config.esTestCluster.secureFiles ?? []).filter((file) => file.startsWith(GCS_SETTING_PREFIX));

describe('evals_security_persona_matrix_parity config set', () => {
  const originalEnv = process.env;
  let writeFileSyncSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GCS_CREDENTIALS;
    // Observe filesystem writes without performing them, so a regression cannot leave a file behind.
    writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
  });

  afterEach(() => {
    writeFileSyncSpy.mockRestore();
    process.env = originalEnv;
  });

  describe('GCS credentials at module load', () => {
    it('adds no secure file and writes nothing when GCS_CREDENTIALS is absent', () => {
      const { servers } = loadConfigs();

      expect(servers).toBeDefined();
      expect(gcsSecureFiles(servers)).toEqual([]);
      expect(writeFileSyncSpy).not.toHaveBeenCalled();
    });

    it('writes the sentinel credentials to a temp file when GCS_CREDENTIALS is set (positive control)', () => {
      process.env.GCS_CREDENTIALS = SENTINEL_CREDENTIALS;

      const { servers } = loadConfigs();

      expect(gcsSecureFiles(servers)).toHaveLength(1);
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('gcs-credentials-'),
        SENTINEL_CREDENTIALS,
        { mode: 0o600 }
      );
    });
  });

  it('opts out of agentBuilder:experimentalFeatures', () => {
    const { servers } = loadConfigs();

    expect(servers.kbnTestServer.serverArgs).not.toContain(EXPERIMENTAL_FEATURES_ARG);
  });

  it('differs from the parent persona-matrix config only by that opt-out', () => {
    const { servers, personaMatrixConfig } = loadConfigs();

    // Guards the premise of the fork: one arg difference, nothing else.
    expect(personaMatrixConfig.kbnTestServer.serverArgs).toContain(EXPERIMENTAL_FEATURES_ARG);
    expect(servers.kbnTestServer.serverArgs).toEqual(
      personaMatrixConfig.kbnTestServer.serverArgs.filter(
        (arg) => arg !== EXPERIMENTAL_FEATURES_ARG
      )
    );
  });
});
