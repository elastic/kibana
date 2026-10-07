/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

// Run the actual inline workflow script without credentials or network access:
// node --test .github/scripts/flaky_fix_verifier_validation.test.ts
const workflow = readFileSync(
  new URL('../workflows/flaky-fix-verifier.md', import.meta.url),
  'utf8'
);
const lock = readFileSync(
  new URL('../workflows/flaky-fix-verifier.lock.yml', import.meta.url),
  'utf8'
);
const scriptMatch = workflow.match(
  /      - name: Validate flaky fix PR\n[\s\S]*?          script: \|\n((?:            [^\n]*\n|\n)+)/
);
assert.ok(scriptMatch, 'Validation must remain inline in the trusted workflow');
const script = scriptMatch[1].replace(/^            /gm, '');
const headSha = 'a'.repeat(40);

interface Fixture {
  prNumber?: string;
  author?: string;
  state?: string;
  repository?: string | null;
  sha?: string;
  membership?: string;
  membershipStatus?: number;
  prStatus?: number;
  token?: string;
}

const createRun = (fixture: Fixture = {}) => {
  const calls = { prNumbers: [] as number[], authors: [] as string[], tokens: [] as string[] };
  const outputs: Record<string, string> = {};
  const run = async (): Promise<void> => {
    await runInNewContext(`(async () => {\n${script}\n})()`, {
      process: {
        env: {
          PR_NUMBER: fixture.prNumber ?? '42',
          ORG_MEMBERSHIP_TOKEN: fixture.token ?? 'test-token',
        },
      },
      context: { repo: { owner: 'elastic', repo: 'kibana' }, actor: 'trusted-triggering-user' },
      github: {
        rest: {
          pulls: {
            get: async (args: { owner: string; repo: string; pull_number: number }) => {
              assert.equal(args.owner, 'elastic');
              assert.equal(args.repo, 'kibana');
              calls.prNumbers.push(args.pull_number);
              if (fixture.prStatus)
                throw Object.assign(new Error('PR lookup failed'), { status: fixture.prStatus });
              return {
                data: {
                  state: fixture.state ?? 'open',
                  user: { login: fixture.author ?? 'elastic-member' },
                  head: {
                    repo:
                      fixture.repository === null
                        ? null
                        : { full_name: fixture.repository ?? 'elastic/kibana' },
                    sha: fixture.sha ?? headSha,
                  },
                },
              };
            },
          },
        },
      },
      getOctokit: (token: string) => {
        calls.tokens.push(token);
        return {
          rest: {
            orgs: {
              getMembershipForUser: async (args: { org: string; username: string }) => {
                assert.equal(args.org, 'elastic');
                calls.authors.push(args.username);
                if (fixture.membershipStatus) {
                  throw Object.assign(new Error('Response may contain sensitive diagnostics'), {
                    status: fixture.membershipStatus,
                  });
                }
                return { data: { state: fixture.membership ?? 'active' } };
              },
            },
          },
        };
      },
      core: {
        setOutput: (key: string, value: string) => {
          outputs[key] = value;
        },
        info: () => {},
      },
    });
  };
  return { run, calls, outputs };
};

test('allows an active Elastic member and checks the PR author, not the triggering user', async () => {
  const { run, calls, outputs } = createRun();
  await run();
  assert.deepEqual(calls.authors, ['elastic-member']);
  assert.deepEqual(calls.prNumbers, [42]);
  assert.deepEqual(outputs, { head_sha: headSha });
});

test('allows kibanamachine without an organization lookup', async () => {
  const { run, calls, outputs } = createRun({ author: 'kibanamachine', token: '' });
  await run();
  assert.deepEqual(calls.tokens, []);
  assert.deepEqual(outputs, { head_sha: headSha });
});

for (const author of ['elastic-member', 'kibanamachine']) {
  for (const repository of ['elastic-member/kibana', null]) {
    test(`rejects ${author} with source repository ${repository}`, async () => {
      const { run, calls, outputs } = createRun({ author, repository });
      await assert.rejects(run, /requires a branch in elastic\/kibana/);
      assert.deepEqual(calls.tokens, []);
      assert.deepEqual(outputs, {});
    });
  }
}

for (const membershipStatus of [401, 403, 404, 429, 500]) {
  test(`fails closed on membership HTTP ${membershipStatus}`, async () => {
    const { run, outputs } = createRun({ membershipStatus });
    await assert.rejects(run, (error: Error) => {
      assert.match(error.message, new RegExp(`HTTP ${membershipStatus}`));
      assert.doesNotMatch(error.message, /sensitive diagnostics/);
      return true;
    });
    assert.deepEqual(outputs, {});
  });
}

for (const [name, fixture, message] of [
  ['pending membership', { membership: 'pending' }, /active Elastic organization member/],
  ['missing membership token', { token: '' }, /KIBANAMACHINE_TOKEN is required/],
  ['closed PR', { state: 'closed' }, /requires an open PR/],
  ['missing head SHA', { sha: '' }, /valid head commit SHA/],
  ['invalid head SHA', { sha: 'main' }, /valid head commit SHA/],
  ['failed PR lookup', { prStatus: 404 }, /PR lookup failed/],
] as const) {
  test(`rejects ${name}`, async () => {
    const { run, outputs } = createRun(fixture);
    await assert.rejects(run, message);
    assert.deepEqual(outputs, {});
  });
}

for (const prNumber of ['', '0', '-1', '1.5', '1e2', '42; command', '9007199254740992']) {
  test(`rejects invalid PR number ${JSON.stringify(prNumber)} before calling GitHub`, async () => {
    const { run, calls } = createRun({ prNumber });
    await assert.rejects(run, /positive integer PR number/);
    assert.deepEqual(calls.prNumbers, []);
  });
}

const getJob = (name: string): string => {
  const match = lock.match(
    new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-zA-Z_][\\w-]*:|$(?![\\s\\S]))`, 'm')
  );
  assert.ok(match, `Missing generated job ${name}`);
  return match[0];
};

test('all trigger paths resolve the target PR before validation', () => {
  assert.match(
    getJob('validate_pr'),
    /PR_NUMBER: \$\{\{ github.event.pull_request.number \|\| github.event.issue.number \|\| github.event.inputs.pr_number \}\}/
  );
  assert.match(getJob('validate_pr'), /needs: pre_activation/);
  assert.match(getJob('validate_pr'), /needs.pre_activation.outputs.activated == 'true'/);
});

test('validation has no checkout, repository code execution, or continue-on-error bypass', () => {
  const job = getJob('validate_pr');
  assert.doesNotMatch(job, /actions\/checkout|\brequire\(|continue-on-error/);
  assert.match(job, /ORG_MEMBERSHIP_TOKEN: \$\{\{ secrets.KIBANAMACHINE_TOKEN \}\}/);
});

test('activation, agent, and output jobs depend on successful validation', () => {
  for (const name of ['activation', 'agent', 'safe_outputs']) {
    assert.match(getJob(name), /needs:\n(?:      - [^\n]+\n)*      - validate_pr\n/);
  }
  assert.match(getJob('prefetch_pr_context'), /needs: activation/);
});

test('agent and safe-output checkouts use the validated SHA, never the mutable PR ref', () => {
  for (const name of ['agent', 'safe_outputs']) {
    const job = getJob(name);
    assert.match(job, /ref: \$\{\{ needs.validate_pr.outputs.head_sha \}\}/);
    assert.doesNotMatch(job, /ref: refs\/pull\//);
    assert.doesNotMatch(job, /ORG_MEMBERSHIP_TOKEN/);
  }
});
