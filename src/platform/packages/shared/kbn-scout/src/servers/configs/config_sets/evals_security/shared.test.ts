/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutServerConfig } from '../../../../types';
import { withEvalsSecurity } from './shared';

const CONFIG_SETS_DIR = join(__dirname, '..');
const STATEFUL_CONFIG = 'stateful/classic.stateful.config';
const DEFAULT_CONFIG_SET = 'evals_tracing';
const SECURITY_SUITES_DIR = 'x-pack/solutions/security/';
// Security suites that live outside `x-pack/solutions/security/`. Empty today: every Security suite
// is in that directory. Add an id here, not a path exception, when one is not.
const EXTRA_SECURITY_SUITE_IDS: string[] = [];

const OVERRIDE_PREFIXES = [
  '--uiSettings.overrides.genAiSettings:tokenUsageTracking=',
  '--uiSettings.overrides.agentBuilder:tracing:includeUserData=',
  '--uiSettings.overrides.agentBuilder:tracing:includeToolDetails=',
];
const TOKEN_USAGE_ARG = `${OVERRIDE_PREFIXES[0]}true`;
const INCLUDE_USER_DATA_ARG = `${OVERRIDE_PREFIXES[1]}true`;
const INCLUDE_TOOL_DETAILS_ARG = `${OVERRIDE_PREFIXES[2]}true`;

const serverArgs = (configSet: string, env: Record<string, string> = {}): string[] => {
  let servers: ScoutServerConfig | undefined;
  jest.isolateModules(() => {
    Object.assign(process.env, env);
    ({ servers } = jest.requireActual(join(CONFIG_SETS_DIR, configSet, STATEFUL_CONFIG)));
  });
  if (!servers) throw new Error(`${configSet} failed to load`);
  return servers.kbnTestServer.serverArgs;
};

const expectSecurityOverrides = (configSet: string, env?: Record<string, string>) => {
  const args = serverArgs(configSet, env);

  expect(args).toContain(TOKEN_USAGE_ARG);
  expect(args).toContain(INCLUDE_USER_DATA_ARG);
  // Set even though TRACING_EXPORTERS is unset: without it SkillInvoked scores 0 for every model.
  expect(args).toContain(INCLUDE_TOOL_DETAILS_ARG);
  OVERRIDE_PREFIXES.forEach((prefix) => {
    expect(args.filter((arg) => arg.startsWith(prefix))).toHaveLength(1);
  });
};

describe('withEvalsSecurity', () => {
  const base = (serverArgs_: string[]) =>
    ({ kbnTestServer: { env: {}, serverArgs: serverArgs_ } } as unknown as ScoutServerConfig);

  it('adds the overrides once and replaces inherited values', () => {
    const args = withEvalsSecurity(
      base([
        '--uiSettings.overrides.genAiSettings:tokenUsageTracking=false',
        '--uiSettings.overrides.agentBuilder:tracing:includeUserData=false',
        '--other=1',
      ])
    ).kbnTestServer.serverArgs;

    expect(args).toEqual([
      '--other=1',
      TOKEN_USAGE_ARG,
      INCLUDE_USER_DATA_ARG,
      INCLUDE_TOOL_DETAILS_ARG,
    ]);
  });

  it('keeps every inherited --config, which can be passed more than once', () => {
    const original = process.env.AGENT_BUILDER_TRACING_EXPORTERS;
    // The exporters env var used to add a `--config=` override that de-duplicated on the bare
    // `--config=` prefix and so dropped every inherited one; it must stay inert.
    process.env.AGENT_BUILDER_TRACING_EXPORTERS = '[{"url":"https://example.test/v1/traces"}]';
    try {
      const args = withEvalsSecurity(
        base(['--config=/a/kibana.tracing.yml', '--config=/b/other.yml'])
      ).kbnTestServer.serverArgs;

      expect(args).toEqual(
        expect.arrayContaining(['--config=/a/kibana.tracing.yml', '--config=/b/other.yml'])
      );
    } finally {
      if (original === undefined) delete process.env.AGENT_BUILDER_TRACING_EXPORTERS;
      else process.env.AGENT_BUILDER_TRACING_EXPORTERS = original;
    }
  });
});

describe('Security eval suites', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // `evals_tracing` only sets includeToolDetails when CI is set; pinning it keeps the
    // "unconditional" assertion meaningful for a local run too.
    process.env.CI = 'true';
    delete process.env.GCS_CREDENTIALS;
    delete process.env.TRACING_EXPORTERS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  interface SuiteEntry {
    id: string;
    configPath: string;
    serverConfigSet?: string;
    scoutArch?: string;
  }
  interface PipelineStep {
    env?: Record<string, string>;
    steps?: PipelineStep[];
  }

  const { suites } = JSON.parse(
    readFileSync(join(REPO_ROOT, '.buildkite/pipelines/evals/evals.suites.json'), 'utf8')
  ) as { suites: SuiteEntry[] };
  const securitySuites = suites.filter(
    ({ id, configPath }) =>
      configPath.startsWith(SECURITY_SUITES_DIR) || EXTRA_SECURITY_SUITE_IDS.includes(id)
  );
  const securitySuiteIds = new Set(securitySuites.map(({ id }) => id));

  const weeklyOverrides = (
    (
      parse(readFileSync(join(REPO_ROOT, '.buildkite/pipelines/evals/llm_evals.yml'), 'utf8')) as {
        steps?: PipelineStep[];
      }
    ).steps ?? []
  )
    .flatMap(({ steps }) => steps ?? [])
    .map(({ env }) => env)
    .filter(
      (env): env is Record<string, string> =>
        Boolean(env?.EVAL_SUITE_ID && env.EVAL_SERVER_CONFIG_SET) &&
        securitySuiteIds.has(env?.EVAL_SUITE_ID ?? '')
    );

  it('has Security suites', () => {
    expect(securitySuites.length).toBeGreaterThan(0);
  });

  it.each(securitySuites.map(({ id, serverConfigSet }) => [id, serverConfigSet]))(
    'Security suite %s resolves to a config set with token usage and tracing details (%s)',
    (_id, serverConfigSet) => {
      expectSecurityOverrides(serverConfigSet ?? DEFAULT_CONFIG_SET);
    }
  );

  it('sets each override exactly once when TRACING_EXPORTERS is set', () => {
    new Set(
      securitySuites.map(({ serverConfigSet }) => serverConfigSet ?? DEFAULT_CONFIG_SET)
    ).forEach((configSet) => {
      expectSecurityOverrides(configSet, { TRACING_EXPORTERS: '[{"http":{"url":"http://x"}}]' });
    });
  });

  it('never pairs a serverless suite with a config set that has no serverless config', () => {
    securitySuites
      .filter(({ scoutArch }) => scoutArch === 'serverless')
      .forEach(({ serverConfigSet = DEFAULT_CONFIG_SET }) => {
        expect(existsSync(join(CONFIG_SETS_DIR, serverConfigSet, 'serverless'))).toBe(true);
      });
  });

  it('keeps weekly pipeline overrides of a Security suite on a config set with the overrides', () => {
    expect(weeklyOverrides.length).toBeGreaterThan(0);
    weeklyOverrides.forEach((env) => {
      expectSecurityOverrides(env.EVAL_SERVER_CONFIG_SET);
    });
  });
});
