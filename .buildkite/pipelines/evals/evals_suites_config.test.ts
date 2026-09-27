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
import { parse as yamlParse } from 'yaml';
import type { EvalsSuiteMetadataEntry } from './eval_pipeline.ts';

// Reads the real config, unlike `eval_pipeline.test.ts` which mocks `fs` with a fixture. These
// mistakes are only reachable by hand-editing the file, so a PR-time check is the cheapest guard.
const suites = (
  JSON.parse(Fs.readFileSync(Path.join(__dirname, 'evals.suites.json'), 'utf-8')) as {
    suites: EvalsSuiteMetadataEntry[];
  }
).suites;

// The weekly LLM evals pipeline (`bk-kibana-evals-weekly-llm-evals`, Saturdays 20:00 GMT on
// `main`) is a hand-maintained step list in `llm_evals.yml`, not generated from the registry —
// a registered suite without a step here silently never gets a main-branch baseline.
const weeklyPipeline = yamlParse(
  Fs.readFileSync(Path.join(__dirname, 'llm_evals.yml'), 'utf-8')
) as { steps: Array<Record<string, any>> };

const flattenSteps = (steps: Array<Record<string, any>>): Array<Record<string, any>> =>
  steps.flatMap((step) => [step, ...flattenSteps(step.steps ?? [])]);

const weeklySuiteIds = new Set(
  flattenSteps(weeklyPipeline.steps)
    .map((step) => step?.env?.EVAL_SUITE_ID)
    .filter((id): id is string => typeof id === 'string')
);

// Suites deliberately excluded from the weekly run. Every entry needs a reason; a new registry
// entry that is not listed here must get a weekly step (or be added here with justification).
const WEEKLY_EXCLUDED_SUITES: Record<string, string> = {
  'smoke-tests': 'PR-only by design',
  'entity-analytics': 'superseded by entity-analytics-v2, which has a weekly step',
  'security-persona-matrix': 'needs product input on cadence/cost',
  'security-persona-matrix-attack-discovery': 'needs product input on cadence/cost',
  'security-automatic-migrations': 'needs product input on cadence/cost',
  'lead-generation': 'needs product input on cadence/cost',
  ml: 'needs product input on cadence/cost',
  'observability-ai': 'removed from the weekly run (#289834)',
};

const shardedSuites = suites.filter((suite) => (suite.shards?.length ?? 0) > 0);

// `run_suite.sh` lowercases the id and rewrites every other character to `-` to build the step key,
// so ids outside this set are not distinct from each other once keyed. Requiring the safe form up
// front keeps the id and the key identical, with no transform to reason about.
const STEP_KEY_SAFE_ID = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

describe('the weekly eval pipeline membership', () => {
  it('pins every registered suite into llm_evals.yml, or onto the intentional-exclusion list', () => {
    const problems: string[] = [];

    for (const { id: suiteId } of suites) {
      if (!weeklySuiteIds.has(suiteId) && !WEEKLY_EXCLUDED_SUITES[suiteId]) {
        problems.push(
          `${suiteId}: registered in evals.suites.json but has no weekly step in llm_evals.yml ` +
            `(add one, or list it in WEEKLY_EXCLUDED_SUITES with a reason)`
        );
      }
    }

    // Every exclusion must still be a real registry entry, so stale entries cannot pile up.
    for (const suiteId of Object.keys(WEEKLY_EXCLUDED_SUITES)) {
      if (!suites.some(({ id }) => id === suiteId)) {
        problems.push(
          `WEEKLY_EXCLUDED_SUITES lists "${suiteId}", which is not in evals.suites.json`
        );
      }
      if (weeklySuiteIds.has(suiteId)) {
        problems.push(`WEEKLY_EXCLUDED_SUITES lists "${suiteId}", which has a weekly step`);
      }
    }

    // Guards against the whole check going vacuous on a parse/walk regression.
    expect(suites.length).toBeGreaterThan(0);
    expect(weeklySuiteIds.size).toBeGreaterThan(0);
    expect(weeklySuiteIds.has('threat-intel-enrichment')).toBe(true);
    expect(problems).toEqual([]);
  });
});

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
