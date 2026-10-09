/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1.0"; you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.elastic.co/licensing/elastic-license
 *
 * or in writing, software distributed under the Apache License, Version 2.0
 * which is available at https://www.apache.org/licenses/LICENSE-2.0.
 *
 * This product includes software developed at third-party
 * specifications (https://github.com/elastic/spec).
 */

import Fs from 'fs';
import Path from 'path';
import { parse as parseYaml } from 'yaml';
import type { EvalsSuiteMetadataEntry } from './eval_pipeline.ts';

// Reads the real config, unlike `eval_pipeline.test.ts` which mocks `fs` with a fixture. These
// mistakes are only reachable by hand-editing the file, so a PR-time check is the cheapest guard.
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

describe('evals.suites.json Scout arch/domain', () => {
  it('only uses arches run_suite.sh and the evals CLI support, with a domain for serverless', () => {
    const problems = suites.flatMap(({ id, scoutArch, scoutDomain }) => {
      if (scoutArch === undefined) return [];
      if (scoutArch !== 'stateful' && scoutArch !== 'serverless') {
        return [`${id}: scoutArch "${scoutArch}" is not stateful or serverless`];
      }
      // `node scripts/evals start` refuses a serverless suite without a domain; catch it at PR time.
      if (scoutArch === 'serverless' && !scoutDomain) {
        return [`${id}: scoutArch "serverless" has no scoutDomain`];
      }
      return [];
    });

    expect(problems).toEqual([]);
  });
});

interface WeeklyStep {
  env?: Record<string, string | undefined>;
  steps?: WeeklyStep[];
}

// Every suite step in llm_evals.yml, including those nested in groups.
const weeklySuiteSteps = (steps: WeeklyStep[]): WeeklyStep[] =>
  steps.flatMap(({ env = {}, steps: nested = [] }) => [
    ...(env.EVAL_SUITE_ID ? [{ env }] : []),
    ...weeklySuiteSteps(nested),
  ]);

const stepsFromYamlText = (text: string) =>
  weeklySuiteSteps((parseYaml(text) as WeeklyStep).steps ?? []);

const suiteSteps = stepsFromYamlText(
  Fs.readFileSync(Path.join(__dirname, 'llm_evals.yml'), 'utf-8')
);

const weeklyModelGroupsBySuite = new Map(
  suiteSteps.map(({ env }) => [
    env.EVAL_SUITE_ID!,
    new Set((env.EVAL_MODEL_GROUPS ?? '').split(',').filter(Boolean)),
  ])
);

describe('evals.suites.json weeklyEisModelGroups', () => {
  it('is covered by the EVAL_MODEL_GROUPS of the suite step in llm_evals.yml', () => {
    // The weekly job requests EVAL_MODEL_GROUPS, not weeklyEisModelGroups, so a model present only
    // in evals.suites.json is provisioned but never gets a step. Fail on the PR that drifts.
    const problems = suites
      .filter((suite) => (suite.weeklyEisModelGroups?.length ?? 0) > 0)
      .flatMap(({ id, weeklyEisModelGroups = [] }) => {
        const requested = weeklyModelGroupsBySuite.get(id);
        if (!requested) {
          return [`${id}: has weeklyEisModelGroups but no step in llm_evals.yml`];
        }
        return weeklyEisModelGroups
          .filter((model) => !requested.has(model))
          .map((model) => `${id}: "${model}" is in weeklyEisModelGroups but not in llm_evals.yml`);
      });

    expect(problems).toEqual([]);
  });
});

describe('llm_evals.yml suite steps', () => {
  const knownSuiteIds = new Set(suites.map(({ id }) => id));

  it('names a suite that exists in evals.suites.json', () => {
    // The weeklyEisModelGroups coverage check above only cross-checks suites that define
    // weeklyEisModelGroups, so a mistyped EVAL_SUITE_ID on any other step would otherwise stay
    // green. Fail listing the unknown ids.
    const unknownIds = suiteSteps
      .map(({ env }) => env.EVAL_SUITE_ID!)
      .filter((id) => !knownSuiteIds.has(id));

    expect(unknownIds).toEqual([]);
  });

  it('flags an unknown suite id, including one nested in a group', () => {
    // Exercises the same path as the check above on a hand-written pipeline: both a top-level
    // mistyped id and one nested inside a group step must surface in the unknown list.
    const unknownIdsIn = (text: string) =>
      stepsFromYamlText(text)
        .map(({ env }) => env.EVAL_SUITE_ID!)
        .filter((id) => !knownSuiteIds.has(id));

    expect(
      unknownIdsIn(
        [
          'steps:',
          '  - command: run_suite.sh',
          '    env:',
          '      EVAL_SUITE_ID: security-attack-discovery-fp-tpp',
          '  - group: weekly',
          '    steps:',
          '      - command: run_suite.sh',
          '        env:',
          '          EVAL_SUITE_ID: attack-discovery',
          '  - command: run_suite.sh',
          '    env:',
          '      EVAL_SUITE_ID: security-attack-discovery-fp-tp',
          '',
        ].join('\n')
      )
    ).toEqual(['security-attack-discovery-fp-tpp']);
  });

  it('sets EVAL_SERVER_CONFIG_SET on every step whose suite defines a serverConfigSet', () => {
    // run_suite.sh only reads the env var, so a step without it silently boots the default
    // `evals_tracing` stack. These suites pre-date the rule and are not fixed here.
    const allowlist = new Set(['attack-discovery', 'skill-selection-benchmark']);
    const serverConfigSetBySuite = new Map(
      suites.flatMap(({ id, serverConfigSet }) => (serverConfigSet ? [[id, serverConfigSet]] : []))
    );

    const problems = suiteSteps.map(({ env = {} }) => {
      const suiteId = env.EVAL_SUITE_ID!;
      if (allowlist.has(suiteId)) return null;
      const expected = serverConfigSetBySuite.get(suiteId);
      if (expected === undefined || env.EVAL_SERVER_CONFIG_SET === expected) return null;
      return (
        `${suiteId}: suite declares serverConfigSet "${expected}" but the step env has ` +
        `"${env.EVAL_SERVER_CONFIG_SET ?? 'no EVAL_SERVER_CONFIG_SET'}"`
      );
    });

    expect(problems.filter(Boolean)).toEqual([]);
  });

  it('flags a missing or mismatched EVAL_SERVER_CONFIG_SET, including in a group-nested step', () => {
    // Exercises the check above on a hand-written pipeline: a non-allowlisted suite whose
    // serverConfigSet is absent must surface, while the allowlisted one must not.
    const allowlist = new Set(['attack-discovery', 'skill-selection-benchmark']);
    const serverConfigSetBySuite = new Map(
      suites.flatMap(({ id, serverConfigSet }) => (serverConfigSet ? [[id, serverConfigSet]] : []))
    );

    const configSetProblemsIn = (text: string) =>
      stepsFromYamlText(text)
        .filter(
          ({ env = {} }) => env.EVAL_SUITE_ID !== undefined && !allowlist.has(env.EVAL_SUITE_ID)
        )
        .map(({ env = {} }) => {
          const expected = serverConfigSetBySuite.get(env.EVAL_SUITE_ID!);
          if (expected === undefined || env.EVAL_SERVER_CONFIG_SET === expected) return null;
          return (
            `${env.EVAL_SUITE_ID}: suite declares serverConfigSet "${expected}" but the step env has ` +
            `"${env.EVAL_SERVER_CONFIG_SET ?? 'no EVAL_SERVER_CONFIG_SET'}"`
          );
        })
        .filter(Boolean);

    expect(
      configSetProblemsIn(
        [
          'steps:',
          '  - command: run_suite.sh',
          '    env:',
          '      EVAL_SUITE_ID: nightshift-investigations',
          '  - group: weekly',
          '    steps:',
          '      - command: run_suite.sh',
          '        env:',
          '          EVAL_SUITE_ID: attack-discovery',
          '',
        ].join('\n')
      )
    ).toEqual([
      'nightshift-investigations: suite declares serverConfigSet "evals_nightshift_investigations" ' +
        'but the step env has "no EVAL_SERVER_CONFIG_SET"',
    ]);
  });
});
