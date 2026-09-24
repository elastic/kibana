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
      expect(servers.kbnTestServer.serverArgs).toEqual(tracing.kbnTestServer.serverArgs);
    }
  );

  it('enables the investigation engine and loads the sandbox config with SANDBOX_KIBANA_CONFIG', () => {
    const args = loadServers(configPath, { SANDBOX_KIBANA_CONFIG }).kbnTestServer.serverArgs;

    expect(NIGHTSHIFT_ENABLED_FLAG).toBeTruthy();
    expect(args).toContain(`--feature_flags.overrides.${NIGHTSHIFT_ENABLED_FLAG}=true`);
    expect(args).toContain('--xpack.nightshift_investigations.enabled=true');
    expect(args).toContain('--xpack.evals.enabled=true');
    expect(args).toContain('--uiSettings.overrides.agentBuilder:experimentalFeatures=true');
    expect(args.filter((arg: string) => arg.startsWith('--config='))).toEqual([
      `--config=${SANDBOX_KIBANA_CONFIG}`,
    ]);
    expect(args.some((arg: string) => arg.includes('xpack.sandbox'))).toBe(false);
  });

  it('fails fast when SANDBOX_KIBANA_CONFIG points at a missing file', () => {
    expect(() =>
      loadServers(configPath, { SANDBOX_KIBANA_CONFIG: '/does/not/exist/kibana.sandbox.yml' })
    ).toThrow(
      'SANDBOX_KIBANA_CONFIG references a missing file: /does/not/exist/kibana.sandbox.yml'
    );
  });
});
