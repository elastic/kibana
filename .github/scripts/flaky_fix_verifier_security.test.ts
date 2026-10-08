/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Run with: node --test .github/scripts/flaky_fix_verifier_security.test.ts
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
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
const compiled = readWorkflow('flaky-fix-verifier.lock.yml');
const findStep = (job: Job, name: string): Step => {
  const step = job.steps.find((candidate) => candidate.name === name);
  assert.ok(step, `Missing step: ${name}`);
  return step;
};
const headA = 'a'.repeat(40);
const headB = 'b'.repeat(40);
const eligiblePr = {
  state: 'open',
  head: { sha: headA, repo: { full_name: 'elastic/kibana' } },
  user: { login: 'kibanamachine' },
  labels: [{ name: 'flaky-fix-check:passed' }],
  draft: true,
};

const runStep = async (
  step: Step,
  pr = eligiblePr,
  expectedHead = headA,
  env: Record<string, string> = {}
) => {
  const mutations: string[] = [];
  const outputs: Record<string, string> = {};
  const files: Record<string, string> = {};
  const fakeFs = {
    mkdirSync: () => {},
    existsSync: () => true,
    writeFileSync: (file: string, value: string) => {
      files[file] = value;
    },
    readFileSync: (file: string) =>
      file.endsWith('head-sha.txt')
        ? expectedHead
        : JSON.stringify({ items: [{ type: 'close_as_duplicate', canonical_pr: '123' }] }),
  };
  const source = step.with?.script;
  assert.ok(source);
  await runInNewContext(`(async () => { ${source}\n })()`, {
    process: {
      env: {
        PR_NUMBER: '42',
        GH_AW_PR_NUMBER: '42',
        EXPECTED_HEAD_SHA: expectedHead,
        RUNNER_TEMP: '/trusted-temp',
        GH_AW_AGENT_OUTPUT: '/agent-output.json',
        ...env,
      },
    },
    context: { repo: { owner: 'elastic', repo: 'kibana' } },
    github: {
      rest: {
        pulls: { get: async () => ({ data: pr }), update: async () => mutations.push('close') },
        issues: { createComment: async () => mutations.push('comment') },
      },
      graphql: async () => mutations.push('graphql'),
    },
    core: {
      info: () => {},
      warning: () => {},
      setOutput: (key: string, value: string) => {
        outputs[key] = value;
      },
    },
    require: (name: string) => {
      if (name === 'fs' || name === 'node:fs') return fakeFs;
      if (name === 'node:path') return path;
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  return { mutations, outputs, files };
};

const eligibility = findStep(compiled.jobs.check_pr_eligibility, 'Check flaky fix PR eligibility');
const guard = findStep(compiled.jobs.safe_outputs, 'Reject results for a changed PR head');

test('eligibility records the same full SHA in trusted output and artifact', async () => {
  const { outputs, files } = await runStep(eligibility);
  assert.equal(outputs.head_sha, headA);
  assert.equal(files['/trusted-temp/verified-pr-head/head-sha.txt'], headA);
});

for (const [name, pr] of Object.entries({
  closed: { ...eligiblePr, state: 'closed' },
  fork: { ...eligiblePr, head: { sha: headA, repo: { full_name: 'attacker/kibana' } } },
  author: { ...eligiblePr, user: { login: 'someone-else' } },
  malformed: { ...eligiblePr, head: { ...eligiblePr.head, sha: 'main' } },
})) {
  test(`eligibility and output gate reject ${name}`, async () => {
    await assert.rejects(runStep(eligibility, pr));
    await assert.rejects(runStep(guard, pr));
  });
}

test('output gate accepts the admitted commit and rejects a developer push', async () => {
  await runStep(guard);
  await assert.rejects(
    runStep(guard, { ...eligiblePr, head: { ...eligiblePr.head, sha: headB } }),
    /PR changed/
  );
  await assert.rejects(runStep(guard, eligiblePr, ''), /Missing validated/);
});

for (const [job, name] of [
  ['mark_pr_ready', 'Mark the fix PR ready for review'],
  ['close_as_duplicate', 'Close the duplicate fix PR'],
]) {
  test(`${job} rejects a changed or missing SHA before mutating the PR`, async () => {
    const step = findStep(compiled.jobs[job], name);
    await assert.rejects(
      runStep(step, { ...eligiblePr, head: { ...eligiblePr.head, sha: headB } }),
      /PR head changed/
    );
    await assert.rejects(runStep(step, eligiblePr, ''), /PR head changed/);
    const { mutations } = await runStep(step);
    assert.equal(mutations.length, 2);
    assert.match(compiled.jobs[job].if ?? '', /needs.safe_outputs.result == 'success'/);
    assert.equal(
      findStep(compiled.jobs[job], 'Download admitted PR head').with?.name,
      'verified-pr-head-${{ github.run_attempt }}'
    );
  });
}

test('agent and output checkout use the admitted SHA with direct job dependencies', () => {
  for (const job of ['agent', 'safe_outputs']) {
    assert.ok(compiled.jobs[job].needs?.includes('check_pr_eligibility'));
    const checkout = compiled.jobs[job].steps.find((step) =>
      step.uses?.startsWith('actions/checkout@')
    );
    assert.equal(checkout?.with?.ref, '${{ needs.check_pr_eligibility.outputs.head_sha }}');
  }
  const steps = compiled.jobs.safe_outputs.steps;
  assert.ok(steps.indexOf(guard) < steps.findIndex((step) => step.id === 'process_safe_outputs'));
  assert.equal(
    compiled.jobs.prefetch_pr_context.with?.expected_head_sha,
    '${{ needs.check_pr_eligibility.outputs.head_sha }}'
  );
});

for (const heads of [[headA, headA], [headB], [headA, headB]]) {
  test(`prefetch validates the head before and after fetching: ${heads
    .map((sha) => sha[0])
    .join(' -> ')}`, async () => {
    const prefetch = readWorkflow('prefetch-pr-context.yml');
    const step = findStep(prefetch.jobs.prefetch_pr_context, 'Fetch PR context');
    let calls = 0;
    let fetched = false;
    const result = runInNewContext(`(async () => { ${step.with?.script}\n })()`, {
      process: { env: { EXPECTED_HEAD_SHA: headA, REPO: 'elastic/kibana', PR_NUMBER: '42' } },
      github: {
        rest: { pulls: { get: async () => ({ data: { head: { sha: heads[calls++] } } }) } },
      },
      core: {},
      require: () => ({
        prefetchPrContext: async () => {
          fetched = true;
        },
      }),
    });
    if (heads.includes(headB)) await assert.rejects(result, /PR head changed/);
    else await result;
    assert.equal(fetched, heads[0] === headA);
  });
}

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
