/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

// `src/` packages cannot import `@kbn/nightshift-shared` (x-pack), so read the flag from its source
// to fail if it is renamed again without this config set following (see #292333).
const NIGHTSHIFT_ENABLED_FLAG = /NIGHTSHIFT_ENABLED_FLAG = '([^']+)'/.exec(
  readFileSync(
    join(REPO_ROOT, 'x-pack/platform/packages/shared/kbn-nightshift-shared/index.ts'),
    'utf8'
  )
)?.[1];

const SANDBOX_ENV = {
  SANDBOX_API_HOST: 'sandbox.example.com',
  SANDBOX_API_PORT: '9443',
  SANDBOX_API_KEY: 'key',
  SANDBOX_CLIENT_CERT: 'CERT',
  SANDBOX_CLIENT_KEY: 'KEY',
  SANDBOX_CA_CERT: 'CA',
};

const loadConfig = (env: Record<string, string>) => {
  let loaded: typeof import('./classic.stateful.config') | undefined;
  jest.isolateModules(() => {
    Object.assign(process.env, env);
    loaded = jest.requireActual('./classic.stateful.config');
  });
  if (!loaded) throw new Error('config failed to load');
  return loaded;
};

describe('evals_nightshift_investigations config set', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NIGHTSHIFT_DATASETS;
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('SANDBOX_')) delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('starts plain evals_tracing when no sandbox credentials are available', () => {
    const { servers } = loadConfig({});
    const { servers: tracing } = jest.requireActual(
      '../../evals_tracing/stateful/classic.stateful.config'
    );
    expect(servers.kbnTestServer.serverArgs).toEqual(tracing.kbnTestServer.serverArgs);
  });

  it('enables the investigation availability flag and engine by default with credentials', () => {
    const { servers } = loadConfig(SANDBOX_ENV);
    const args = servers.kbnTestServer.serverArgs;

    expect(NIGHTSHIFT_ENABLED_FLAG).toBeTruthy();
    expect(args).toContain(`--feature_flags.overrides.${NIGHTSHIFT_ENABLED_FLAG}=true`);
    expect(args).toContain('--xpack.nightshift_investigations.enabled=true');
  });

  it('writes the sandbox connection to an owner-only config file instead of process args', () => {
    const { servers } = loadConfig(SANDBOX_ENV);
    const args = servers.kbnTestServer.serverArgs;
    const configArg = args.find((arg: string) => arg.startsWith('--config='));
    if (!configArg) throw new Error('expected a --config= server arg');
    expect(args.some((arg: string) => arg.includes('xpack.sandbox'))).toBe(false);

    const written = JSON.parse(readFileSync(configArg.slice('--config='.length), 'utf8'));
    expect(written['xpack.sandbox']).toEqual({
      enabled: true,
      host: 'sandbox.example.com',
      port: 9443,
      api_key: 'key',
      ssl: { certificate: 'CERT', key: 'KEY', certificate_authorities: 'CA' },
    });
  });

  it('fails fast when an investigation selection is requested without credentials', () => {
    expect(() => loadConfig({ NIGHTSHIFT_DATASETS: 'trace-only' })).toThrow(
      'SANDBOX_API_KEY is required'
    );
  });
});
