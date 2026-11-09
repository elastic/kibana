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
import type { ScoutServerConfig } from '../../../../types';

// `src/` packages cannot import `@kbn/nightshift-shared` (x-pack), so read the flags from its source
// to fail if one is renamed again without this config set following (see #292333).
const NIGHTSHIFT_SHARED_SOURCE = readFileSync(
  join(REPO_ROOT, 'x-pack/solutions/observability/packages/kbn-nightshift-shared/index.ts'),
  'utf8'
);
const readFlag = (constant: string) =>
  new RegExp(`${constant} =\\s*'([^']+)'`).exec(NIGHTSHIFT_SHARED_SOURCE)?.[1];
const NIGHTSHIFT_ENABLED_FLAG = readFlag('NIGHTSHIFT_ENABLED_FLAG');
const NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG = readFlag('NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG');

const SANDBOX_KIBANA_CONFIG = join(
  REPO_ROOT,
  'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/scout/kibana.sandbox.yml'
);

const loadServers = (modulePath: string, env: Record<string, string>): ScoutServerConfig => {
  let servers: ScoutServerConfig | undefined;
  jest.isolateModules(() => {
    Object.assign(process.env, env);
    ({ servers } = jest.requireActual(modulePath));
  });
  if (!servers) throw new Error(`${modulePath} failed to load`);
  return servers;
};

describe.each([
  {
    arch: 'stateful',
    configPath: './stateful/classic.stateful.config',
    tracingPath: '../evals_tracing/stateful/classic.stateful.config',
  },
  {
    arch: 'serverless',
    configPath: './serverless/observability_complete.serverless.config',
    tracingPath: '../evals_tracing/serverless/observability_complete.serverless.config',
  },
])('evals_nightshift_investigations config set ($arch)', ({ arch, configPath, tracingPath }) => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NIGHTSHIFT_DATASETS;
    delete process.env.NIGHTSHIFT_CONNECTORS_KIBANA_CONFIG;
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('SANDBOX_')) delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it(`runs on the ${arch} evals_tracing config`, () => {
    const servers = loadServers(configPath, { SANDBOX_KIBANA_CONFIG });
    expect(servers.serverless ?? false).toBe(arch === 'serverless');
    if (arch === 'serverless') {
      expect(servers.kbnTestServer.serverArgs).toContain('--serverless=oblt');
    }
  });

  // The config set must ignore NIGHTSHIFT_DATASETS: Scout is reused when only the selection changes.
  it.each([undefined, 'synthetic-smoke', 'trace-only', 'all'])(
    'starts plain evals_tracing without the sandbox Kibana config (NIGHTSHIFT_DATASETS=%s)',
    (selection) => {
      const servers = loadServers(configPath, {
        SANDBOX_API_KEY: 'key',
        ...(selection ? { NIGHTSHIFT_DATASETS: selection } : {}),
      });
      const tracing = loadServers(tracingPath, {});
      expect(servers.kbnTestServer.serverArgs).toEqual([
        ...tracing.kbnTestServer.serverArgs.filter(
          (arg: string) => !arg.startsWith('--telemetry.tracing.exporters=')
        ),
        `--config=${join(__dirname, 'kibana.tracing.yml')}`,
      ]);
    }
  );

  it('enables the investigation engine and loads the sandbox config with SANDBOX_KIBANA_CONFIG', () => {
    const args = loadServers(configPath, { SANDBOX_KIBANA_CONFIG }).kbnTestServer.serverArgs;

    expect(NIGHTSHIFT_ENABLED_FLAG).toBeTruthy();
    expect(args).toContain(`--feature_flags.overrides.${NIGHTSHIFT_ENABLED_FLAG}=true`);
    expect(args).toContain('--xpack.nightshift_investigations.enabled=true');
    expect(args).toContain('--xpack.security.serviceAccounts.enabled=true');
    expect(args).toContain('--xpack.evals.enabled=true');
    expect(args).toContain('--xpack.evals.mode=full');
    expect(args.filter((arg: string) => arg.startsWith('--config='))).toEqual([
      `--config=${join(__dirname, 'kibana.tracing.yml')}`,
      `--config=${SANDBOX_KIBANA_CONFIG}`,
    ]);
    expect(args.some((arg: string) => arg.includes('xpack.sandbox'))).toBe(false);
  });

  it('pauses online evals, so investigations are judged only by the suite', () => {
    const args = loadServers(configPath, { SANDBOX_KIBANA_CONFIG }).kbnTestServer.serverArgs;

    expect(NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG).toBeTruthy();
    expect(args).toContain(`--feature_flags.overrides.${NIGHTSHIFT_ONLINE_EVALS_PAUSED_FLAG}=true`);
  });

  it('fails fast when SANDBOX_KIBANA_CONFIG points at a missing file', () => {
    expect(() =>
      loadServers(configPath, { SANDBOX_KIBANA_CONFIG: '/does/not/exist/kibana.sandbox.yml' })
    ).toThrow(
      'SANDBOX_KIBANA_CONFIG references a missing file: /does/not/exist/kibana.sandbox.yml'
    );
  });

  it('reserves capacity for sixteen investigations and five background tasks', () => {
    const servers = loadServers(configPath, { SANDBOX_KIBANA_CONFIG });
    expect(servers.kbnTestServer.serverArgs).toContain('--xpack.task_manager.capacity=21');
  });

  it('loads the optional connector set YAML and keeps tracing exporter headers in the environment', () => {
    const connectorsConfig = join(SANDBOX_KIBANA_CONFIG, '../connector_sets/orcabench.yml');
    const exporters = JSON.stringify([
      {
        http: {
          url: 'https://traces.example.com',
          headers: { Authorization: 'ApiKey trace-test-key' },
        },
      },
    ]);
    const servers = loadServers(configPath, {
      SANDBOX_KIBANA_CONFIG,
      NIGHTSHIFT_CONNECTORS_KIBANA_CONFIG: connectorsConfig,
      TRACING_EXPORTERS: exporters,
    });
    expect(servers.kbnTestServer.serverArgs).toContain(`--config=${connectorsConfig}`);
    expect(servers.kbnTestServer.serverArgs.join(' ')).not.toContain('trace-test-key');
    expect(servers.kbnTestServer.env?.NIGHTSHIFT_TRACING_EXPORTERS).toBe(exporters);
  });

  it('keeps exporter headers out of smoke-only process arguments', () => {
    const exporters = JSON.stringify([
      { http: { url: 'https://traces.example.com', headers: { Authorization: 'smoke-key' } } },
    ]);
    const servers = loadServers(configPath, { TRACING_EXPORTERS: exporters });
    expect(servers.kbnTestServer.serverArgs.join(' ')).not.toContain('smoke-key');
    expect(servers.kbnTestServer.env?.NIGHTSHIFT_TRACING_EXPORTERS).toBe(exporters);
    expect(servers.kbnTestServer.serverArgs).toContain(
      `--config=${join(__dirname, 'kibana.tracing.yml')}`
    );
  });

  it('fails fast when the connector set YAML is missing', () => {
    expect(() =>
      loadServers(configPath, {
        SANDBOX_KIBANA_CONFIG,
        NIGHTSHIFT_CONNECTORS_KIBANA_CONFIG: '/missing.yml',
      })
    ).toThrow('NIGHTSHIFT_CONNECTORS_KIBANA_CONFIG references a missing file');
  });
});
