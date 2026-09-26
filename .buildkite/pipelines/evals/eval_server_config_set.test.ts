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

/**
 * The weekly llm_evals.yml steps hand-write their env block, so a suite's registered
 * `serverConfigSet` in evals.suites.json can drift from what the static step actually
 * sets. `run_suite.sh` falls back to `evals_tracing` when EVAL_SERVER_CONFIG_SET is
 * absent, so a missing/wrong value silently boots the wrong Scout stack for that suite
 * (e.g. leaving a plugin the suite depends on disabled) with no error at run time.
 *
 * This only checks suites that are known to hand-write their weekly step (rather than
 * being generated) and that declare a `serverConfigSet` -- new manually-authored weekly
 * steps for a suite with a registered config set should add themselves here.
 */
const BUILDKITE_ROOT = Path.resolve(__dirname, '../..');

const read = (relativePath: string) =>
  Fs.readFileSync(Path.join(BUILDKITE_ROOT, relativePath), 'utf-8');

interface PipelineStep {
  key?: string;
  env?: Record<string, string>;
  steps?: PipelineStep[];
}

const flattenSteps = (steps: PipelineStep[]): PipelineStep[] =>
  steps.flatMap((step) => [step, ...flattenSteps(step.steps ?? [])]);

const suites = (
  JSON.parse(read('pipelines/evals/evals.suites.json')) as {
    suites: EvalsSuiteMetadataEntry[];
  }
).suites;

const pipeline = yamlParse(read('pipelines/evals/llm_evals.yml')) as { steps: PipelineStep[] };
const stepsByKey = new Map(
  flattenSteps(pipeline.steps)
    .filter((step) => step.key)
    .map((step) => [step.key as string, step])
);

// Maps the hand-written weekly step key to the suite id whose registered serverConfigSet it
// must match. Add an entry here whenever a new weekly step is hand-written for a suite that
// declares serverConfigSet in evals.suites.json.
const WEEKLY_STEP_TO_SUITE_ID: Record<string, string> = {
  'kbn-evals-weekly-attack-discovery-fp-tp': 'security-attack-discovery-fp-tp',
};

describe('llm_evals.yml EVAL_SERVER_CONFIG_SET', () => {
  it("matches the suite's registered serverConfigSet for every mapped weekly step", () => {
    const problems: string[] = [];

    for (const [stepKey, suiteId] of Object.entries(WEEKLY_STEP_TO_SUITE_ID)) {
      const step = stepsByKey.get(stepKey);
      if (!step) {
        problems.push(`${stepKey}: no step with this key in llm_evals.yml`);
        continue;
      }
      const suite = suites.find((s) => s.id === suiteId);
      if (!suite) {
        problems.push(`${stepKey}: no suite "${suiteId}" in evals.suites.json`);
        continue;
      }
      const expected = suite.serverConfigSet;
      const actual = step.env?.EVAL_SERVER_CONFIG_SET;
      if (expected && actual !== expected) {
        // Absent (undefined) falls back to `evals_tracing` in run_suite.sh, which is wrong
        // for any suite that registers a different config set.
        problems.push(`${stepKey}: env sets "${actual}", suite expects "${expected}"`);
      }
    }

    expect(problems).toEqual([]);
  });
});
