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
const MAX_PAYLOAD_PREFIX = '--server.maxPayload=';
const maxPayloadArgs = (args: string[]) => args.filter((arg) => arg.startsWith(MAX_PAYLOAD_PREFIX));

// Importing a config set evaluates `withEvalsTracing`, which writes `GCS_CREDENTIALS` to a temp file
// at module load. Nothing here imports a config statically: each test loads the chain inside
// `loadConfigs`, after the env has been set up, so the runner env never leaks a real key to disk.
interface LoadedConfigs {
  servers: ScoutServerConfig;
  evalsTracingConfig: ScoutServerConfig;
}

const loadConfigs = (): LoadedConfigs => {
  let loaded: LoadedConfigs | undefined;
  jest.isolateModules(() => {
    const { servers } = jest.requireActual('./classic.stateful.config');
    const { servers: evalsTracingConfig } = jest.requireActual(
      '../../evals_tracing/stateful/classic.stateful.config'
    );
    loaded = { servers, evalsTracingConfig };
  });
  if (!loaded) throw new Error('evals_security_persona_matrix config failed to load');
  return loaded;
};

const gcsSecureFiles = (config: ScoutServerConfig): string[] =>
  (config.esTestCluster.secureFiles ?? []).filter((file) => file.startsWith(GCS_SETTING_PREFIX));

describe('evals_security_persona_matrix config set', () => {
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

  it('raises server.maxPayload to 50MB, exactly once', () => {
    const { servers } = loadConfigs();

    expect(maxPayloadArgs(servers.kbnTestServer.serverArgs)).toEqual([
      '--server.maxPayload=52428800',
    ]);
  });

  it('does not leave the inherited lower cap in the args', () => {
    const { servers, evalsTracingConfig } = loadConfigs();

    // Guards the premise: the parent config still pins a lower cap that must not survive.
    expect(maxPayloadArgs(evalsTracingConfig.kbnTestServer.serverArgs).length).toBeGreaterThan(0);
    for (const inherited of maxPayloadArgs(evalsTracingConfig.kbnTestServer.serverArgs)) {
      expect(servers.kbnTestServer.serverArgs).not.toContain(inherited);
    }
  });

  it('keeps every other inherited arg', () => {
    const { servers, evalsTracingConfig } = loadConfigs();

    const inherited = evalsTracingConfig.kbnTestServer.serverArgs.filter(
      (arg) => !arg.startsWith(MAX_PAYLOAD_PREFIX)
    );
    expect(servers.kbnTestServer.serverArgs).toEqual(expect.arrayContaining(inherited));
  });
});
