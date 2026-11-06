/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutServerConfig } from '../../../../types';

const CONFIG_SETS_DIR = join(__dirname, '..');
const STATEFUL_CONFIG = 'stateful/classic.stateful.config';
const DEFAULT_CONFIG_SET = 'evals_tracing';
const SECURITY_SUITES_DIR = 'x-pack/solutions/security/';
// Security suites that live outside `x-pack/solutions/security/`. Empty today: every Security suite
// is in that directory. Add an id here, not a path exception, when one is not.
const EXTRA_SECURITY_SUITE_IDS: string[] = [];

const TOKEN_USAGE_ARG = '--uiSettings.overrides.genAiSettings:tokenUsageTracking=true';
const INCLUDE_USER_DATA_ARG = '--uiSettings.overrides.agentBuilder:tracing:includeUserData=true';
const INCLUDE_TOOL_DETAILS_ARG =
  '--uiSettings.overrides.agentBuilder:tracing:includeToolDetails=true';
const EXPORTERS_ARG_PREFIX = '--xpack.agentBuilder.tracing.exporters=';

/**
 * Every `evals_*` config set that is NOT Security. All other discovered sets must be built on
 * `evals_security`, so a new Security set that extends `evals_tracing` directly fails here
 * instead of silently running without token usage tracking. A new non-Security set has to be
 * added to this list on purpose.
 */
const NON_SECURITY_CONFIG_SETS = [
  'evals_tracing',
  'evals_agent_builder',
  'evals_alerting_v2',
  'evals_nightshift_investigations',
  // Platform-owned: the benchmark spans platform and security skills and is not Security-owned.
  'evals_skill_selection',
  // Platform-owned, no Security suite; tracked as a follow-up.
  'evals_workflows',
  'evals_automatic_import',
];

const discoverConfigSets = (): string[] =>
  readdirSync(CONFIG_SETS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('evals_'))
    .map(({ name }) => name)
    .filter((name) => existsSync(join(CONFIG_SETS_DIR, name, `${STATEFUL_CONFIG}.ts`)))
    .sort();

const loadServers = (configSet: string, env: Record<string, string> = {}): ScoutServerConfig => {
  let servers: ScoutServerConfig | undefined;
  jest.isolateModules(() => {
    Object.assign(process.env, env);
    ({ servers } = jest.requireActual(join(CONFIG_SETS_DIR, configSet, STATEFUL_CONFIG)));
  });
  if (!servers) throw new Error(`${configSet} failed to load`);
  return servers;
};

const serverArgs = (configSet: string, env?: Record<string, string>): string[] =>
  loadServers(configSet, env).kbnTestServer.serverArgs;

describe('evals config sets', () => {
  const originalEnv = process.env;
  const configSets = discoverConfigSets();
  const securityConfigSets = configSets.filter((name) => !NON_SECURITY_CONFIG_SETS.includes(name));

  beforeEach(() => {
    process.env = { ...originalEnv };
    // `evals_tracing` only sets includeToolDetails when CI is set; pinning it keeps the
    // "unconditional" assertion meaningful for a local run too.
    process.env.CI = 'true';
    delete process.env.GCS_CREDENTIALS;
    delete process.env.TRACING_EXPORTERS;
    delete process.env.AGENT_BUILDER_TRACING_EXPORTERS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('discovers the config sets', () => {
    expect(configSets).toEqual(expect.arrayContaining(['evals_security', 'evals_tracing']));
    expect(NON_SECURITY_CONFIG_SETS.filter((name) => !configSets.includes(name))).toEqual([]);
  });

  describe('Security config sets', () => {
    it.each(securityConfigSets)('%s enables token usage and tracing details', (configSet) => {
      const args = serverArgs(configSet);

      expect(args).toContain(TOKEN_USAGE_ARG);
      expect(args).toContain(INCLUDE_USER_DATA_ARG);
      // Set even though TRACING_EXPORTERS is unset: without it SkillInvoked scores 0 for every model.
      expect(args).toContain(INCLUDE_TOOL_DETAILS_ARG);
    });

    it.each(securityConfigSets)('%s sets each override exactly once', (configSet) => {
      const args = serverArgs(configSet, { TRACING_EXPORTERS: '[{"http":{"url":"http://x"}}]' });

      [
        '--uiSettings.overrides.genAiSettings:tokenUsageTracking=',
        '--uiSettings.overrides.agentBuilder:tracing:includeUserData=',
        '--uiSettings.overrides.agentBuilder:tracing:includeToolDetails=',
      ].forEach((prefix) => {
        expect(args.filter((arg) => arg.startsWith(prefix))).toHaveLength(1);
      });
    });
  });

  describe('non-Security config sets', () => {
    it.each(NON_SECURITY_CONFIG_SETS)('%s does not enable token usage tracking', (configSet) => {
      expect(serverArgs(configSet).some((arg) => arg.includes('tokenUsageTracking'))).toBe(false);
    });
  });

  describe('AGENT_BUILDER_TRACING_EXPORTERS', () => {
    it('adds no exporters arg when unset', () => {
      expect(serverArgs('evals_security').some((arg) => arg.startsWith(EXPORTERS_ARG_PREFIX))).toBe(
        false
      );
    });

    it('passes a valid value through to every Security config set', () => {
      const exporters = '[{"url":"https://golden.example/v1/traces"}]';

      securityConfigSets.forEach((configSet) => {
        const args = serverArgs(configSet, { AGENT_BUILDER_TRACING_EXPORTERS: exporters });

        expect(args.filter((arg) => arg.startsWith(EXPORTERS_ARG_PREFIX))).toEqual([
          `${EXPORTERS_ARG_PREFIX}${exporters}`,
        ]);
      });
    });

    it('accepts exporter headers', () => {
      const exporters = '[{"url":"https://golden.example/v1/traces","headers":{"x-key":"v"}}]';

      expect(
        serverArgs('evals_security', { AGENT_BUILDER_TRACING_EXPORTERS: exporters })
      ).toContain(`${EXPORTERS_ARG_PREFIX}${exporters}`);
    });

    it.each([
      ['the telemetry shape', '[{"grpc":{"url":"https://golden.example:4317"}}]'],
      ['a non-array', '{"url":"https://golden.example/v1/traces"}'],
      ['a non-string url', '[{"url":42}]'],
      ['a null entry', '[null]'],
    ])('throws on %s, which Kibana would reject at boot', (_name, exporters) => {
      expect(() =>
        loadServers('evals_security', { AGENT_BUILDER_TRACING_EXPORTERS: exporters })
      ).toThrow(/AGENT_BUILDER_TRACING_EXPORTERS/);
    });

    it('throws on malformed JSON instead of starting a stack with a broken exporter', () => {
      expect(() =>
        loadServers('evals_security', { AGENT_BUILDER_TRACING_EXPORTERS: '[{' })
      ).toThrow(SyntaxError);
    });
  });

  describe('evals.suites.json', () => {
    interface SuiteEntry {
      id: string;
      configPath: string;
      serverConfigSet?: string;
      scoutArch?: string;
    }
    const { suites } = JSON.parse(
      readFileSync(join(REPO_ROOT, '.buildkite/pipelines/evals/evals.suites.json'), 'utf8')
    ) as { suites: SuiteEntry[] };
    const securitySuites = suites.filter(
      ({ id, configPath }) =>
        configPath.startsWith(SECURITY_SUITES_DIR) || EXTRA_SECURITY_SUITE_IDS.includes(id)
    );

    it('has Security suites', () => {
      expect(securitySuites.length).toBeGreaterThan(0);
    });

    it.each(securitySuites.map(({ id, serverConfigSet }) => [id, serverConfigSet]))(
      'Security suite %s resolves to a config set built on evals_security (%s)',
      (_id, serverConfigSet) => {
        const configSet = serverConfigSet ?? DEFAULT_CONFIG_SET;

        expect(securityConfigSets).toContain(configSet);
      }
    );

    it('never pairs a serverless suite with a Security set that has no serverless config', () => {
      const serverlessSecuritySuites = securitySuites.filter(
        ({ scoutArch }) => scoutArch === 'serverless'
      );

      serverlessSecuritySuites.forEach(({ serverConfigSet = DEFAULT_CONFIG_SET }) => {
        expect(existsSync(join(CONFIG_SETS_DIR, serverConfigSet, 'serverless'))).toBe(true);
      });
    });

    it('only names config sets that exist', () => {
      suites.forEach(({ serverConfigSet }) => {
        if (serverConfigSet) expect(configSets).toContain(serverConfigSet);
      });
    });

    interface PipelineStep {
      env?: Record<string, string>;
      steps?: PipelineStep[];
    }

    it('keeps weekly pipeline overrides of a Security suite on a Security config set', () => {
      const pipeline = parse(
        readFileSync(join(REPO_ROOT, '.buildkite/pipelines/evals/llm_evals.yml'), 'utf8')
      ) as { steps?: PipelineStep[] };
      const securitySuiteIds = new Set(securitySuites.map(({ id }) => id));

      const overrides = (pipeline.steps ?? [])
        .flatMap(({ steps }) => steps ?? [])
        .map(({ env }) => env)
        .filter(
          (env): env is Record<string, string> =>
            Boolean(env?.EVAL_SUITE_ID && env.EVAL_SERVER_CONFIG_SET) &&
            securitySuiteIds.has(env?.EVAL_SUITE_ID ?? '')
        );

      expect(overrides.length).toBeGreaterThan(0);
      overrides.forEach((env) => {
        expect(securityConfigSets).toContain(env.EVAL_SERVER_CONFIG_SET);
      });
    });
  });
});
