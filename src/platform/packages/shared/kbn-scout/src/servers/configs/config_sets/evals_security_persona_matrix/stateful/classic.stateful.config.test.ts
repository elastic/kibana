/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers } from './classic.stateful.config';
import { servers as evalsTracingConfig } from '../../evals_tracing/stateful/classic.stateful.config';

const MAX_PAYLOAD_PREFIX = '--server.maxPayload=';
const maxPayloadArgs = (args: string[]) => args.filter((arg) => arg.startsWith(MAX_PAYLOAD_PREFIX));

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
    let servers: typeof import('./classic.stateful.config').servers | undefined;
    jest.isolateModules(() => {
      ({ servers } = jest.requireActual('./classic.stateful.config'));
    });
    expect(servers?.esTestCluster.secureFiles ?? []).not.toContainEqual(
      expect.stringContaining(GCS_SETTING_PREFIX)
    );
  });
});

describe('evals_security_persona_matrix config set', () => {
  it('raises server.maxPayload to 50MB, exactly once', () => {
    expect(maxPayloadArgs(servers.kbnTestServer.serverArgs)).toEqual([
      '--server.maxPayload=52428800',
    ]);
  });

  it('does not leave the inherited lower cap in the args', () => {
    // Guards the premise: the parent config still pins a lower cap that must not survive.
    expect(maxPayloadArgs(evalsTracingConfig.kbnTestServer.serverArgs).length).toBeGreaterThan(0);
    for (const inherited of maxPayloadArgs(evalsTracingConfig.kbnTestServer.serverArgs)) {
      expect(servers.kbnTestServer.serverArgs).not.toContain(inherited);
    }
  });

  it('keeps every other inherited arg', () => {
    const inherited = evalsTracingConfig.kbnTestServer.serverArgs.filter(
      (arg) => !arg.startsWith(MAX_PAYLOAD_PREFIX)
    );
    expect(servers.kbnTestServer.serverArgs).toEqual(expect.arrayContaining(inherited));
  });
});
