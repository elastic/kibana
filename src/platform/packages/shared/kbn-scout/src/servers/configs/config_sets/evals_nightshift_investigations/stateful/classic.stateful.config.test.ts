/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

const CLEANUP_EVENTS: readonly string[] = ['exit', 'SIGINT', 'SIGTERM', 'SIGHUP'];

type Listener = (...args: unknown[]) => void;

// `process` has per-event overloads, so go through the plain EventEmitter signatures instead.
const emitter: NodeJS.EventEmitter = process;
const listenersOf = (event: string): Listener[] =>
  emitter
    .listeners(event)
    .filter((listener): listener is Listener => typeof listener === 'function');

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

const configDirs = new Set<string>();

const loadConfig = (env: Record<string, string>) => {
  let loaded: typeof import('./classic.stateful.config') | undefined;
  jest.isolateModules(() => {
    Object.assign(process.env, env);
    loaded = jest.requireActual('./classic.stateful.config');
  });
  if (!loaded) throw new Error('config failed to load');
  const configArg = loaded.servers.kbnTestServer.serverArgs.find((arg: string) =>
    arg.startsWith('--config=')
  );
  if (configArg) configDirs.add(dirname(configArg.slice('--config='.length)));
  return loaded;
};

afterAll(() => {
  for (const dir of configDirs) rmSync(dir, { recursive: true, force: true });
});

describe('evals_nightshift_investigations config set', () => {
  const originalEnv = process.env;
  let listenersBefore: Map<string, Listener[]>;

  beforeEach(() => {
    listenersBefore = new Map(CLEANUP_EVENTS.map((event) => [event, listenersOf(event)]));
    process.env = { ...originalEnv };
    delete process.env.NIGHTSHIFT_DATASETS;
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('SANDBOX_')) delete process.env[key];
    }
  });

  // Each investigation-config load writes a temp directory and registers exit/signal handlers;
  // remove both so repeated loads neither leak directories nor exceed Node's listener limit.
  afterEach(() => {
    for (const event of CLEANUP_EVENTS) {
      const before = listenersBefore.get(event) ?? [];
      for (const listener of listenersOf(event)) {
        if (!before.includes(listener)) emitter.removeListener(event, listener);
      }
    }
    process.env = originalEnv;
  });

  // The config set must ignore NIGHTSHIFT_DATASETS: Scout is reused when only the selection changes.
  it.each([undefined, 'synthetic-smoke', 'trace-only', 'all'])(
    'starts plain evals_tracing without sandbox credentials (NIGHTSHIFT_DATASETS=%s)',
    (selection) => {
      const { servers } = loadConfig(selection ? { NIGHTSHIFT_DATASETS: selection } : {});
      const { servers: tracing } = jest.requireActual(
        '../../evals_tracing/stateful/classic.stateful.config'
      );
      expect(servers.kbnTestServer.serverArgs).toEqual(tracing.kbnTestServer.serverArgs);
    }
  );

  it.each([undefined, 'synthetic-smoke', 'trace-only', 'all'])(
    'starts the investigation server with sandbox credentials (NIGHTSHIFT_DATASETS=%s)',
    (selection) => {
      const { servers } = loadConfig({
        ...SANDBOX_ENV,
        ...(selection ? { NIGHTSHIFT_DATASETS: selection } : {}),
      });
      expect(servers.kbnTestServer.serverArgs).toContain(
        '--xpack.nightshift_investigations.enabled=true'
      );
    }
  );

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

  it('requires mTLS certificates alongside the API key', () => {
    expect(() => loadConfig({ SANDBOX_API_KEY: 'key' })).toThrow(
      'Sandbox-api mTLS needs SANDBOX_CLIENT_CERT and SANDBOX_CLIENT_KEY'
    );
  });

  it('defaults host and port when the shell exports them empty', () => {
    const { servers } = loadConfig({ ...SANDBOX_ENV, SANDBOX_API_HOST: '', SANDBOX_API_PORT: '' });
    const configArg = servers.kbnTestServer.serverArgs.find((arg: string) =>
      arg.startsWith('--config=')
    );
    if (!configArg) throw new Error('expected a --config= server arg');
    const written = JSON.parse(readFileSync(configArg.slice('--config='.length), 'utf8'));
    expect(written['xpack.sandbox']).toMatchObject({ host: 'localhost', port: 9090 });
  });

  it.each(['abc', '0', '65536', '9090.5'])(
    'rejects SANDBOX_API_PORT=%s before registering signal handlers',
    (port) => {
      // Only this config set registers signal handlers; the evals_tracing parent it imports may
      // add its own `exit` handler (for GCS_CREDENTIALS), so signals are the precise check.
      const signalListeners = process.listenerCount('SIGTERM');
      expect(() => loadConfig({ ...SANDBOX_ENV, SANDBOX_API_PORT: port })).toThrow(
        `SANDBOX_API_PORT must be an integer between 1 and 65535, got "${port}"`
      );
      expect(process.listenerCount('SIGTERM')).toBe(signalListeners);
    }
  );

  it('names the variable and path when a PEM file cannot be read', () => {
    const { SANDBOX_CLIENT_CERT, ...env } = SANDBOX_ENV;
    expect(() =>
      loadConfig({ ...env, SANDBOX_CLIENT_CERT_PATH: '/does/not/exist/tls.crt' })
    ).toThrow('Cannot read SANDBOX_CLIENT_CERT_PATH (/does/not/exist/tls.crt): ');
  });
});
