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
import { DEFAULT_AGENT_IMAGE_CONFIG } from '../../pipeline-utils/agent_images';

/**
 * Eval steps spell out their own agent block, so they opt out of the repo-wide agent defaults and
 * have to request the boot disk themselves. Undersized, ES sits below its merge disk watermark and
 * stops merging segments mid-suite. `eval_pipeline.ts` imports the default directly; bash and
 * static YAML cannot, so their copies are pinned here.
 */

const EXPECTED_DISK_SIZE_GB = DEFAULT_AGENT_IMAGE_CONFIG.diskSizeGb;
const RUN_SUITE_SH = 'steps/evals/run_suite.sh';
const BUILDKITE_ROOT = Path.resolve(__dirname, '../..');

const read = (relativePath: string) =>
  Fs.readFileSync(Path.join(BUILDKITE_ROOT, relativePath), 'utf-8');

interface PipelineStep {
  label?: string;
  command?: string;
  agents?: { diskSizeGb?: number };
  steps?: PipelineStep[];
}

// Groups nest their steps, so collect from both levels.
const flattenSteps = (steps: PipelineStep[]): PipelineStep[] =>
  steps.flatMap((step) => [step, ...flattenSteps(step.steps ?? [])]);

describe('eval agent boot disk', () => {
  it('is the repo-wide default, so bumping that does not leave evals behind', () => {
    // Guards the tests below: a default of `undefined` would make them vacuous.
    expect(typeof EXPECTED_DISK_SIZE_GB).toBe('number');
  });

  it('matches in the fanout steps that run_suite.sh generates for itself', () => {
    const script = read(`scripts/${RUN_SUITE_SH}`);
    const [, fallback] =
      script.match(/EVAL_AGENT_DISK_SIZE_GB="\$\{EVAL_AGENT_DISK_SIZE_GB:-(\d+)\}"/) ?? [];

    // Nothing sets this in CI today, so the fallback is the value the fanout agents actually get.
    expect(Number(fallback)).toBe(EXPECTED_DISK_SIZE_GB);
  });

  it('matches on every llm_evals.yml step that runs a suite', () => {
    const pipeline = yamlParse(read('pipelines/evals/llm_evals.yml')) as { steps: PipelineStep[] };
    const suiteSteps = flattenSteps(pipeline.steps).filter((step) =>
      step.command?.includes(RUN_SUITE_SH)
    );

    // Every one of these boots a Scout stack, so none of them may be left on the image default.
    expect(suiteSteps.length).toBeGreaterThan(0);

    const problems = suiteSteps
      .filter((step) => step.agents?.diskSizeGb !== EXPECTED_DISK_SIZE_GB)
      .map((step) => `"${step.label}" requests ${step.agents?.diskSizeGb}`);

    expect(problems).toEqual([]);
  });
});
