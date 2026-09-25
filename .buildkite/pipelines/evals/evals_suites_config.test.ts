/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import type { EvalsSuiteMetadataEntry } from './eval_pipeline.ts';

// Reads the real config, unlike `eval_pipeline.test.ts` which mocks `fs` with a fixture. These
// mistakes are only reachable by hand-editing the file, so a PR-time check is the cheapest guard.
const REPO_ROOT = Path.resolve(__dirname, '../../..');

const suites = (
  JSON.parse(Fs.readFileSync(Path.join(__dirname, 'evals.suites.json'), 'utf-8')) as {
    suites: EvalsSuiteMetadataEntry[];
  }
).suites;

const shardedSuites = suites.filter((suite) => (suite.shards?.length ?? 0) > 0);

// `run_suite.sh` lowercases the id and rewrites every other character to `-` to build the step key,
// so ids outside this set are not distinct from each other once keyed. Requiring the safe form up
// front keeps the id and the key identical, with no transform to reason about.
const STEP_KEY_SAFE_ID = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

describe('evals.suites.json shards', () => {
  it('gives every shard an id that survives step-key slugification, unique within its suite', () => {
    const problems: string[] = [];

    for (const { id: suiteId, shards = [] } of shardedSuites) {
      const seen = new Set<string>();

      shards.forEach((shard, index) => {
        const shardId = shard.id?.trim();
        if (!shardId) {
          // An empty id leaves the step key unsuffixed, so two of them collide and Buildkite
          // rejects the whole fanout upload.
          problems.push(`${suiteId}: shard at index ${index} has no id`);
          return;
        }
        if (!STEP_KEY_SAFE_ID.test(shardId)) {
          // e.g. `feature/a` and `feature-a` both key as `feature-a`, colliding the step keys and
          // merging the two shards' failure-log metadata.
          problems.push(`${suiteId}: shard id "${shardId}" is not lowercase [a-z0-9_-]`);
        }
        if (seen.has(shardId)) {
          problems.push(`${suiteId}: duplicate shard id "${shardId}"`);
        }
        seen.add(shardId);
      });
    }

    expect(problems).toEqual([]);
  });

  it('gives every shard at least one spec file to run', () => {
    const problems = shardedSuites.flatMap(({ id: suiteId, shards = [] }) =>
      shards
        // A shard with no spec files runs the whole suite, overlapping every other shard.
        .filter((shard) => !shard.specFiles?.length)
        .map((shard) => `${suiteId}: shard "${shard.id}" lists no specFiles`)
    );

    expect(problems).toEqual([]);
  });

  it('keeps spec file paths safe to interpolate into the fanout pipeline', () => {
    // The paths are space-joined into one env var and re-split by the fanout step, then written
    // into a double-quoted YAML scalar that Buildkite interpolates. Whitespace would split one path
    // into two; `\` and `"` would break the scalar; `$` would be substituted away.
    const problems = shardedSuites.flatMap(({ id: suiteId, shards = [] }) =>
      shards.flatMap((shard) =>
        (shard.specFiles ?? [])
          .filter((specFile) => !/^[\w./-]+\.spec\.ts$/.test(specFile))
          .map((specFile) => `${suiteId}: shard "${shard.id}" has unsafe specFile "${specFile}"`)
      )
    );

    expect(problems).toEqual([]);
  });

  it('never lists the same spec file in two shards of a suite', () => {
    const problems = shardedSuites.flatMap(({ id: suiteId, shards = [] }) => {
      const owners = new Map<string, string[]>();

      for (const shard of shards) {
        for (const specFile of shard.specFiles ?? []) {
          owners.set(specFile, [...(owners.get(specFile) ?? []), shard.id]);
        }
      }

      return [...owners]
        .filter(([, shardIds]) => shardIds.length > 1)
        .map(([specFile, shardIds]) => `${suiteId}: "${specFile}" is in [${shardIds.join(', ')}]`);
    });

    expect(problems).toEqual([]);
  });
});

// `run_suite.sh` exports each `ci.env` name as a shell variable and writes the value into a
// double-quoted YAML scalar that Buildkite interpolates.
const SHELL_VARIABLE_NAME = /^[A-Z][A-Z0-9_]*$/;
const YAML_SAFE_VALUE = /^[\w.,:/-]+$/;
// `run_suite.sh` splits each `ci.requiredConfig` path on dots for `jq getpath`.
const HOOK_VARIABLE = /^(SANDBOX_|NIGHTSHIFT_SANDBOX_|NIGHTSHIFT_TELEMETRY_)/;
const CONFIG_PATH = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)*$/;

describe('evals.suites.json CI declarations', () => {
  it('keeps `ci.env` names and values safe for the shell and the fanout pipeline', () => {
    // `run_suite.sh` exports each name and writes the value into a double-quoted YAML scalar that
    // Buildkite interpolates, so names must be plain variables and values must not need escaping.
    const problems = suites.flatMap(({ id: suiteId, ci }) =>
      Object.entries(ci?.env ?? {})
        .filter(([name, value]) => !SHELL_VARIABLE_NAME.test(name) || !YAML_SAFE_VALUE.test(value))
        .map(([name, value]) => `${suiteId}: unsafe ci.env entry ${name}=${JSON.stringify(value)}`)
    );

    expect(problems).toEqual([]);
  });

  it('never lets ci.env default a variable the suite scout hook reads or exports', () => {
    // The hook falls back to same-named shell variables and its output is exported per child, so a
    // committed default would either feed the hook or shadow a credential in the fanout YAML.
    const problems = suites.flatMap(({ id: suiteId, ci }) =>
      Object.keys(ci?.env ?? {})
        .filter((name) => HOOK_VARIABLE.test(name))
        .map((name) => `${suiteId}: ci.env must not set ${name}`)
    );

    expect(problems).toEqual([]);
  });

  it('points every scoutHook at a script in the tree, since run_suite.sh runs it with bash', () => {
    const missing = suites
      .filter(({ scoutHook }) => scoutHook && !Fs.existsSync(Path.resolve(REPO_ROOT, scoutHook)))
      .map(({ id }) => id);

    expect(missing).toEqual([]);
  });

  it('names required config entries as dotted paths run_suite.sh can hand to jq', () => {
    const problems = suites.flatMap(({ id: suiteId, ci }) =>
      (ci?.requiredConfig ?? [])
        .filter((path) => !CONFIG_PATH.test(path))
        .map((path) => `${suiteId}: unsafe ci.requiredConfig entry ${JSON.stringify(path)}`)
    );

    expect(problems).toEqual([]);
  });

  it('runs the customer0 investigations on the sandbox config set, declaring its secrets and dataset', () => {
    // The declaration is what keeps the run label-triggerable without a laptop sandbox: the
    // required config paths come from the evals Vault config, and the env pins the stored dataset.
    const suite = suites.find(({ id }) => id === 'nightshift-investigations-customer0');

    expect(suite).toMatchObject({
      ciLabels: ['evals:nightshift-investigations-customer0'],
      scoutHook:
        'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/scout/scout_hook.sh',
      configPath:
        'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/playwright.config.ts',
      serverConfigSet: 'evals_nightshift_investigations',
      stepTimeoutInMinutes: 180,
      defaultModelGroups: ['eis/anthropic-claude-4.6-sonnet'],
      ci: {
        excludeFromAll: true,
        requiredConfig: [
          'sandbox.host',
          'sandbox.apiKey',
          'sandbox.ssl.certificate',
          'sandbox.ssl.key',
          'sandbox.ssl.certificateAuthorities',
          'nightshift.telemetry.url',
          'nightshift.telemetry.apiKey',
        ],
        env: {
          NIGHTSHIFT_DATASETS: 'trace-only',
          NIGHTSHIFT_DATASET_NAME: 'nightshift/customer0-manual',
          EVAL_FANOUT_CONCURRENCY: '1',
          SCOUT_TEST_RETRIES: '0',
        },
      },
    });
    // The synthetic smoke label keeps its own entry and stays free of sandbox requirements.
    const smoke = suites.find(({ id }) => id === 'nightshift-investigations');
    expect(smoke?.ci).toBeUndefined();
    expect(smoke?.ciLabels).toEqual(['evals:nightshift-investigations']);
  });
});
