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

const SUITE_SCOUT_DIR = join(
  REPO_ROOT,
  'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/scout'
);
const SANDBOX_KIBANA_CONFIG = join(SUITE_SCOUT_DIR, 'kibana.sandbox.yml');
const TELEMETRY_KIBANA_CONFIG = join(SUITE_SCOUT_DIR, 'kibana.telemetry.yml');

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
  { arch: 'stateful', configPath: './stateful/classic.stateful.config' },
  { arch: 'serverless', configPath: './serverless/observability_complete.serverless.config' },
])('evals_nightshift_investigations config set ($arch)', ({ configPath }) => {
  const originalEnv = process.env;
  const exporters = JSON.stringify([
    { http: { url: 'https://traces.example.com', headers: { Authorization: 'ApiKey trace-key' } } },
  ]);

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SANDBOX_KIBANA_CONFIG;
    delete process.env.NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads the optional telemetry YAML and keeps tracing exporter headers in the environment', () => {
    const { serverArgs, env } = loadServers(configPath, {
      SANDBOX_KIBANA_CONFIG,
      NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG: TELEMETRY_KIBANA_CONFIG,
      TRACING_EXPORTERS: exporters,
    }).kbnTestServer;

    expect(serverArgs).toContain(`--config=${TELEMETRY_KIBANA_CONFIG}`);
    expect(serverArgs.join(' ')).not.toContain('trace-key');
    expect(env?.NIGHTSHIFT_TRACING_EXPORTERS).toBe(exporters);
  });

  it('keeps exporter headers out of smoke-only process arguments', () => {
    const { serverArgs, env } = loadServers(configPath, {
      TRACING_EXPORTERS: exporters,
    }).kbnTestServer;

    expect(serverArgs.join(' ')).not.toContain('trace-key');
    expect(env?.NIGHTSHIFT_TRACING_EXPORTERS).toBe(exporters);
    expect(serverArgs).toContain(`--config=${join(__dirname, 'kibana.tracing.yml')}`);
  });

  it('fails fast when SANDBOX_KIBANA_CONFIG points at a missing file', () => {
    expect(() =>
      loadServers(configPath, { SANDBOX_KIBANA_CONFIG: '/does/not/exist/kibana.sandbox.yml' })
    ).toThrow(
      'SANDBOX_KIBANA_CONFIG references a missing file: /does/not/exist/kibana.sandbox.yml'
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
