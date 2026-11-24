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

// A shard split across agents, `<base>-<index>-of-<count>`: every slice runs the same spec files
// and the suite picks its part of the examples from the id.
const SLICE_SHARD_ID = /^(.+)-(\d+)-of-(\d+)$/;

const isOneShardSliced = (shardIds: string[]): boolean => {
  const bases = new Set(shardIds.map((id) => SLICE_SHARD_ID.exec(id)?.[1]));
  return bases.size === 1 && !bases.has(undefined);
};

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

  it('never lists the same spec file in two shards of a suite, except slices of one shard', () => {
    const problems = shardedSuites.flatMap(({ id: suiteId, shards = [] }) => {
      const owners = new Map<string, string[]>();

      for (const shard of shards) {
        for (const specFile of shard.specFiles ?? []) {
          owners.set(specFile, [...(owners.get(specFile) ?? []), shard.id]);
        }
      }

      return [...owners]
        .filter(([, shardIds]) => shardIds.length > 1 && !isOneShardSliced(shardIds))
        .map(([specFile, shardIds]) => `${suiteId}: "${specFile}" is in [${shardIds.join(', ')}]`);
    });

    expect(problems).toEqual([]);
  });

  it('gives fanoutConcurrency and shardStepTimeoutInMinutes a positive integer when set', () => {
    // run_suite.sh writes them into the fanout YAML as is, so a bad value only fails at upload.
    const problems = suites.flatMap((suite) =>
      (['fanoutConcurrency', 'shardStepTimeoutInMinutes'] as const)
        .filter((field) => {
          const value = suite[field];
          return value !== undefined && (!Number.isInteger(value) || value < 1);
        })
        .map((field) => `${suite.id}: ${field} is ${suite[field]}`)
    );

    expect(problems).toEqual([]);
  });

  it('gives concurrency groups names that are already step-key safe', () => {
    // run_suite.sh slugifies the name into the group key, so `a b` and `a-b` would share a queue.
    const problems = suites.flatMap(({ id, concurrencyGroups = {} }) =>
      Object.keys(concurrencyGroups)
        .filter((group) => !STEP_KEY_SAFE_ID.test(group))
        .map((group) => `${id}: concurrency group "${group}" is not lowercase [a-z0-9_-]`)
    );

    expect(problems).toEqual([]);
  });

  it('gives every slice of a shard the same spec files', () => {
    // A slice that lists other specs would leave part of the sliced specs' examples unrun.
    const problems = shardedSuites.flatMap(({ id: suiteId, shards = [] }) => {
      const specsByBase = new Map<string, Set<string>>();
      for (const { id, specFiles = [] } of shards) {
        const base = SLICE_SHARD_ID.exec(id)?.[1];
        if (!base) continue;
        specsByBase.set(
          base,
          (specsByBase.get(base) ?? new Set()).add([...specFiles].sort().join(' '))
        );
      }
      return [...specsByBase]
        .filter(([, specLists]) => specLists.size > 1)
        .map(([base]) => `${suiteId}: slices of "${base}" list different spec files`);
    });

    expect(problems).toEqual([]);
  });

  it('only names concurrency groups the suite defines, each with a positive limit', () => {
    // Every suite, not only sharded ones: a step that runs the whole suite takes its tightest group.
    const problems = suites.flatMap(({ id: suiteId, shards = [], concurrencyGroups = {} }) => [
      ...Object.entries(concurrencyGroups)
        .filter(([, limit]) => !Number.isInteger(limit) || limit < 1)
        .map(([group, limit]) => `${suiteId}: concurrency group "${group}" has limit ${limit}`),
      ...shards
        .filter(
          ({ concurrencyGroup }) => concurrencyGroup && !(concurrencyGroup in concurrencyGroups)
        )
        .map(
          ({ id, concurrencyGroup }) =>
            `${suiteId}: shard "${id}" names undefined concurrency group "${concurrencyGroup}"`
        ),
    ]);

    expect(problems).toEqual([]);
  });

  it('numbers the slices of a shard 1 to count, each once', () => {
    const problems = shardedSuites.flatMap(({ id: suiteId, shards = [] }) => {
      const slicesByBase = new Map<string, Array<{ index: number; count: number }>>();
      for (const { id } of shards) {
        const match = SLICE_SHARD_ID.exec(id);
        if (!match) continue;
        const [, base, index, count] = match;
        slicesByBase.set(base, [
          ...(slicesByBase.get(base) ?? []),
          { index: Number(index), count: Number(count) },
        ]);
      }
      return [...slicesByBase].flatMap(([base, slices]) => {
        const [{ count }] = slices;
        const indices = slices.map(({ index }) => index).sort((left, right) => left - right);
        const expected = Array.from({ length: count }, (_, position) => position + 1);
        return slices.every((slice) => slice.count === count) &&
          indices.join(',') === expected.join(',')
          ? []
          : [`${suiteId}: slices of "${base}" are not 1-of-${count} through ${count}-of-${count}`];
      });
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

// `[suiteId, requested model groups]` for every suite step in llm_evals.yml, including those
// nested in groups.
const weeklySuiteModelGroups = (steps: WeeklyStep[]): Array<[string, Set<string>]> =>
  steps.flatMap(({ env = {}, steps: nested = [] }) => [
    ...(env.EVAL_SUITE_ID
      ? [
          [
            env.EVAL_SUITE_ID,
            new Set((env.EVAL_MODEL_GROUPS ?? '').split(',').filter(Boolean)),
          ] as [string, Set<string>],
        ]
      : []),
    ...weeklySuiteModelGroups(nested),
  ]);

const weeklyModelGroupsBySuite = new Map(
  weeklySuiteModelGroups(
    (parseYaml(Fs.readFileSync(Path.join(__dirname, 'llm_evals.yml'), 'utf-8')) as WeeklyStep)
      .steps ?? []
  )
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

describe('Nightshift CI coverage', () => {
  it('runs the Customer-0 stored datasets alongside isolated ORCA and reinforcement specs', () => {
    const suite = suites.find(({ id }) => id === 'nightshift-investigations');
    expect(suite?.ciLabels).toEqual(['evals:nightshift-investigations']);
    expect(suite?.shards?.map(({ id }) => id)).toEqual([
      'customer0-golden',
      'customer0-connector-probes',
      'orcabench-1-of-5',
      'orcabench-2-of-5',
      'orcabench-3-of-5',
      'orcabench-4-of-5',
      'orcabench-5-of-5',
      'reinforcement',
    ]);
    // Every shard of one model can run at once, and the shards that run 16 sandbox investigations
    // each are capped together across builds, so overlapping PR runs can't overload the pool.
    const shardsByGroup = new Map<string | undefined, number>();
    for (const { concurrencyGroup } of suite?.shards ?? []) {
      shardsByGroup.set(concurrencyGroup, (shardsByGroup.get(concurrencyGroup) ?? 0) + 1);
    }
    for (const [group, count] of shardsByGroup) {
      const limit = group ? suite?.concurrencyGroups?.[group] : suite?.fanoutConcurrency;
      expect(limit).toBeGreaterThanOrEqual(count);
    }
    expect(
      suite?.shards
        ?.filter(({ concurrencyGroup }) => concurrencyGroup === 'sandbox-heavy')
        .map(({ id }) => id)
    ).toEqual(['customer0-golden', 'customer0-connector-probes']);
    expect(suite?.concurrencyGroups).toEqual({ 'sandbox-heavy': 2 });
    const files = [...new Set(suite?.shards?.flatMap(({ specFiles }) => specFiles) ?? [])];
    expect(files).toEqual([
      'evals/investigation/stored.spec.ts',
      'evals/connector_probe/stored.spec.ts',
      'evals/investigation/orcabench.spec.ts',
      'evals/reinforcement/reinforcement.spec.ts',
    ]);
    const configPath = suite?.configPath;
    expect(configPath).toBeDefined();
    if (!configPath) throw new Error('Nightshift config is missing');
    const suiteRoot = Path.dirname(Path.resolve(__dirname, '../../..', configPath));
    for (const file of files) expect(Fs.existsSync(Path.join(suiteRoot, file))).toBe(true);
  });
});
