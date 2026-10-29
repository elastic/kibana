/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutServerConfig } from '../../../../types';

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
  },
  {
    arch: 'serverless',
    configPath: './serverless/observability_complete.serverless.config',
  },
])('evals_nightshift_investigations config set ($arch)', ({ configPath }) => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG;
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('SANDBOX_')) delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('fails fast when SANDBOX_KIBANA_CONFIG points at a missing file', () => {
    expect(() =>
      loadServers(configPath, { SANDBOX_KIBANA_CONFIG: '/does/not/exist/kibana.sandbox.yml' })
    ).toThrow(
      'SANDBOX_KIBANA_CONFIG references a missing file: /does/not/exist/kibana.sandbox.yml'
    );
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
    const servers = loadServers(configPath, {
      SANDBOX_KIBANA_CONFIG,
      NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG: telemetryConfig,
      TRACING_EXPORTERS: exporters,
    });
    expect(servers.kbnTestServer.serverArgs).toContain(`--config=${telemetryConfig}`);
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

  it('fails fast when the telemetry YAML is missing', () => {
    expect(() =>
      loadServers(configPath, {
        SANDBOX_KIBANA_CONFIG,
        NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG: '/missing.yml',
      })
    ).toThrow('NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG references a missing file');
  });
});
