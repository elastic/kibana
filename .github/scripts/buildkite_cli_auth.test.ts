/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Run with: node --test .github/scripts/buildkite_cli_auth.test.ts
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';

interface Step {
  name: string;
  id?: string;
  uses?: string;
  run?: string;
  env?: Record<string, string>;
  with?: Record<string, string>;
}
interface Job {
  needs?: string | string[];
  if?: string;
  steps: Step[];
  outputs?: Record<string, string>;
  with?: Record<string, string>;
}
interface Workflow {
  jobs: Record<string, Job>;
  steps?: Step[];
}
const workflowDir = path.resolve('.github/workflows');
const readWorkflow = (name: string): Workflow => {
  const source = readFileSync(path.join(workflowDir, name), 'utf8');
  return parse(name.endsWith('.md') ? source.split(/^---\s*$/m)[1] : source) as Workflow;
};
const findStep = (job: Job, name: string): Step => {
  const step = job.steps.find((candidate) => candidate.name === name);
  assert.ok(step, `Missing step: ${name}`);
  return step;
};
for (const name of ['flaky-fix-verifier', 'flaky-test-fixer', 'failed-test-investigator']) {
  test(`${name}: CLI authentication is available only through the explicit engine handoff`, () => {
    const workflow = readWorkflow(`${name}.lock.yml`);
    const agentSteps = workflow.jobs.agent.steps;
    const auth = findStep(workflow.jobs.agent, 'Prepare Buildkite CLI authentication');
    assert.equal(auth.env?.OPS_BUILDKITE_TOKEN, '${{ secrets.OPS_BUILDKITE_TOKEN }}');
    assert.doesNotMatch(auth.run ?? '', /GITHUB_ENV/);
    const engine = findStep(workflow.jobs.agent, 'Execute Claude Code CLI');
    assert.equal(engine.env?.BUILDKITE_API_TOKEN, '${{ steps.buildkite_auth.outputs.token }}');
    assert.doesNotMatch(engine.run ?? '', /--exclude-env BUILDKITE_API_TOKEN/);
    assert.ok(agentSteps.indexOf(auth) < agentSteps.indexOf(engine));
    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      for (const step of job.steps ?? []) {
        if (step !== auth) assert.equal(step.env?.OPS_BUILDKITE_TOKEN, undefined);
        if (step !== engine && step.env?.BUILDKITE_API_TOKEN !== undefined) {
          assert.equal(jobName, 'detection');
          assert.equal(step.env.BUILDKITE_API_TOKEN, "${{ '' }}");
          assert.equal(step.env.ANTHROPIC_API_KEY, '${{ secrets.OPENROUTER_API_KEY }}');
        }
      }
    }
  });
}

test('authentication handoff masks the token, writes a step output and fails without a token', () => {
  const setup = readWorkflow('buildkite-cli-setup.md');
  const auth = setup.steps?.find((step) => step.id === 'buildkite_auth');
  assert.ok(auth?.run);
  const dir = mkdtempSync(path.join(tmpdir(), 'bk-auth-test-'));
  const output = path.join(dir, 'output');
  try {
    const env = {
      ...process.env,
      OPS_BUILDKITE_TOKEN: 'synthetic-test-token',
      GITHUB_OUTPUT: output,
    };
    const stdout = execFileSync('bash', ['-c', auth.run], { env, encoding: 'utf8' });
    assert.equal(stdout, '::add-mask::synthetic-test-token\n');
    assert.equal(readFileSync(output, 'utf8'), 'token=synthetic-test-token\n');
    assert.throws(() =>
      execFileSync('bash', ['-c', auth.run ?? ''], {
        env: { ...env, OPS_BUILDKITE_TOKEN: '' },
        stdio: 'pipe',
      })
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
