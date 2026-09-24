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

const SANDBOX_KIBANA_CONFIG = join(
  REPO_ROOT,
  'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/scout/kibana.sandbox.yml'
);

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
    delete process.env.NIGHTSHIFT_CONCURRENCY;
    delete process.env.NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG;
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('SANDBOX_')) delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // The config set must ignore NIGHTSHIFT_DATASETS: Scout is reused when only the selection changes.
  it.each([undefined, 'synthetic-smoke', 'trace-only', 'all'])(
    'starts plain evals_tracing without the sandbox Kibana config (NIGHTSHIFT_DATASETS=%s)',
    (selection) => {
      const { servers } = loadConfig({
        SANDBOX_API_KEY: 'key',
        ...(selection ? { NIGHTSHIFT_DATASETS: selection } : {}),
      });
      const { servers: tracing } = jest.requireActual(
        '../../evals_tracing/stateful/classic.stateful.config'
      );
      expect(servers.kbnTestServer.serverArgs).toEqual(tracing.kbnTestServer.serverArgs);
    }
  );

  it('enables the investigation engine and loads the sandbox config with SANDBOX_KIBANA_CONFIG', () => {
    const { servers } = loadConfig({ SANDBOX_KIBANA_CONFIG });
    const args = servers.kbnTestServer.serverArgs;

    expect(NIGHTSHIFT_ENABLED_FLAG).toBeTruthy();
    expect(args).toContain(`--feature_flags.overrides.${NIGHTSHIFT_ENABLED_FLAG}=true`);
    expect(args).toContain('--xpack.nightshift_investigations.enabled=true');
    expect(args).toContain('--uiSettings.overrides.agentBuilder:experimentalFeatures=true');
    expect(args.filter((arg: string) => arg.startsWith('--config='))).toEqual([
      `--config=${SANDBOX_KIBANA_CONFIG}`,
    ]);
    expect(args.some((arg: string) => arg.includes('xpack.sandbox'))).toBe(false);
  });

  it('fails fast when SANDBOX_KIBANA_CONFIG points at a missing file', () => {
    expect(() =>
      loadConfig({ SANDBOX_KIBANA_CONFIG: '/does/not/exist/kibana.sandbox.yml' })
    ).toThrow(
      'SANDBOX_KIBANA_CONFIG references a missing file: /does/not/exist/kibana.sandbox.yml'
    );
  });
  it.each([
    ['2', 10],
    ['16', 21],
    ['45', 50],
  ])('reserves matching capacity for concurrency %s', (concurrency, capacity) => {
    const { servers } = loadConfig({ SANDBOX_KIBANA_CONFIG, NIGHTSHIFT_CONCURRENCY: concurrency });
    expect(servers.kbnTestServer.serverArgs).toContain(`--xpack.task_manager.capacity=${capacity}`);
  });

  it.each(['0', '46', '1.5', 'invalid', ''])('rejects invalid concurrency %s', (concurrency) => {
    expect(() =>
      loadConfig({ SANDBOX_KIBANA_CONFIG, NIGHTSHIFT_CONCURRENCY: concurrency })
    ).toThrow('integer between 1 and 45');
  });

  it('loads the optional telemetry YAML and keeps tracing exporter headers in the environment', () => {
    const telemetryConfig = join(SANDBOX_KIBANA_CONFIG, '../kibana.telemetry.yml');
    const exporters = JSON.stringify([
      {
        http: {
          url: 'https://traces.example.com',
          headers: { Authorization: 'ApiKey trace-test-key' },
        },
      },
    ]);
    const { servers } = loadConfig({
      SANDBOX_KIBANA_CONFIG,
      NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG: telemetryConfig,
      TRACING_EXPORTERS: exporters,
    });
    expect(servers.kbnTestServer.serverArgs).toContain(`--config=${telemetryConfig}`);
    expect(servers.kbnTestServer.serverArgs.join(' ')).not.toContain('trace-test-key');
    expect(servers.kbnTestServer.env?.NIGHTSHIFT_TRACING_EXPORTERS).toBe(exporters);
  });

  it('fails fast when the telemetry YAML is missing', () => {
    expect(() =>
      loadConfig({ SANDBOX_KIBANA_CONFIG, NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG: '/missing.yml' })
    ).toThrow('NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG references a missing file');
  });
});
