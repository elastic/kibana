/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// These scripts run via actions/github-script outside the Jest project, so
// they use Node's built-in runner:
//   node --test .github/scripts/nightshift_risk_shadow.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');

const run = require('./nightshift_risk_shadow');
const { classify, parseCodeowners, LABEL, MARKER } = run;

// A slice of Kibana's CODEOWNERS, in its own spellings.
const CODEOWNERS = `
# Nightshift
x-pack/solutions/observability/plugins/nightshift @elastic/nightshift
x-pack/solutions/observability/plugins/nightshift_investigations @elastic/nightshift
x-pack/solutions/observability/plugins/significant_events @elastic/nightshift
x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations @elastic/nightshift
x-pack/solutions/observability/packages/kbn-evals-suite-significant-events @elastic/nightshift
x-pack/solutions/observability/packages/kbn-evals-suite-observability-ai @elastic/nightshift
x-pack/platform/plugins/shared/actions/server/lib/relay @elastic/nightshift
src/platform/packages/shared/kbn-workflows/managed/definitions/nightshift_investigations @elastic/nightshift
/packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/nightshift-source @elastic/nightshift
/x-pack/solutions/observability/plugins/observability/test/scout_nightshift_investigations @elastic/nightshift # Scout suite
/x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/significant_events/ @elastic/nightshift
x-pack/platform/plugins/shared/agentic_investigations @elastic/alertzero-common-layer @elastic/nightshift
/**/scout_*/.meta/**
`;

const NI = 'x-pack/solutions/observability/plugins/nightshift_investigations';
const ownersOf = parseCodeowners(CODEOWNERS);
const member = { authorAssociation: 'MEMBER', ownersOf };
const file = (filename, patch = '+ok', extra = {}) => ({
  filename,
  status: 'modified',
  changes: 1,
  patch,
  ...extra,
});

test('a PR with no Nightshift files is out of scope', () => {
  const result = classify([file('src/core/index.ts')], member);
  assert.equal(result.scope, 'none');
  assert.equal(result.tier, null);
});

test('tests, stories, eval data and docs in Nightshift paths are Low', () => {
  const result = classify(
    [
      file(`${NI}/server/lib/foo.test.ts`),
      file(`${NI}/server/lib/__mocks__/foo.ts`),
      file('x-pack/solutions/observability/plugins/nightshift/public/card.stories.tsx'),
      file(
        'x-pack/solutions/observability/packages/kbn-evals-suite-nightshift-investigations/src/datasets/x.ts'
      ),
      file('x-pack/solutions/observability/plugins/significant_events/README.md'),
    ],
    member
  );
  assert.deepEqual(result, { scope: 'nightshift', tier: 'low', reasons: [] });
});

test('Nightshift-owned tests outside the plugins are Low', () => {
  const result = classify(
    [
      file(
        'x-pack/solutions/observability/plugins/observability/test/scout_nightshift_investigations/ui/tests/memory_page.spec.ts'
      ),
      file(
        'x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/significant_events/maintenance.ts'
      ),
    ],
    member
  );
  assert.equal(result.tier, 'low');
});

test('Nightshift-owned code outside the plugins is in scope but not Low', () => {
  for (const path of [
    'x-pack/platform/plugins/shared/actions/server/lib/relay/relay_client.ts',
    'src/platform/packages/shared/kbn-workflows/managed/definitions/nightshift_investigations/agent_optimize/agent_optimize_workflow.yaml',
    'packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/nightshift-source/10.1.0.json',
  ]) {
    const result = classify([file(path)], member);
    assert.equal(result.scope, 'nightshift', path);
    assert.equal(result.tier, 'not_low', path);
  }
});

test('co-owned code such as agentic_investigations is out of scope', () => {
  const result = classify(
    [file('x-pack/platform/plugins/shared/agentic_investigations/server/a.test.ts')],
    member
  );
  assert.equal(result.scope, 'none');
});

test('production code, prompts and config are not Low', () => {
  for (const path of [
    `${NI}/server/lib/service_account/install.ts`,
    `${NI}/server/agents/investigation/instructions/investigator.md.text`,
    `${NI}/kibana.jsonc`,
    `${NI}/package.json`,
  ]) {
    assert.equal(classify([file(path)], member).tier, 'not_low', path);
  }
});

const EVALS = 'x-pack/solutions/observability/packages';

test('eval datasets, seed data, scenarios, data generators and snapshot scripts are Low', () => {
  for (const path of [
    `${EVALS}/kbn-evals-suite-significant-events/src/datasets/bank_of_anthos/discovery.ts`,
    `${EVALS}/kbn-evals-suite-nightshift-investigations/evals/investigation/datasets.ts`,
    `${EVALS}/kbn-evals-suite-nightshift-investigations/src/seed_data/alerts.ts`,
    `${EVALS}/kbn-evals-suite-observability-ai/src/scenarios/payment.ts`,
    `${EVALS}/kbn-evals-suite-significant-events/src/data_generators/snapshot_indices.ts`,
    // Bumping a snapshot run ID, as in PR 295083.
    `${EVALS}/kbn-evals-suite-significant-events/scripts/replay_eval_snapshot/index.ts`,
  ]) {
    assert.equal(classify([file(path)], member).tier, 'low', path);
  }
});

test('eval judges, scorers, evaluators, prompts and harness code are not Low', () => {
  for (const path of [
    `${EVALS}/kbn-evals-suite-nightshift-investigations/evals/investigation/judges/scoring.ts`,
    `${EVALS}/kbn-evals-suite-nightshift-investigations/evals/investigation/judges/prompts.ts`,
    `${EVALS}/kbn-evals-suite-nightshift-investigations/evals/investigation/judges/tool_call_health/system_prompt.text`,
    `${EVALS}/kbn-evals-suite-nightshift-investigations/evals/investigation/task.ts`,
    `${EVALS}/kbn-evals-suite-significant-events/src/evaluators/discovery/common/scores_calibration.ts`,
    `${EVALS}/kbn-evals-suite-observability-ai/src/criteria_evaluator.ts`,
    `${EVALS}/kbn-evals-suite-nightshift-investigations/playwright.config.ts`,
    // A judge that happens to sit under a datasets folder is still a judge.
    `${EVALS}/kbn-evals-suite-significant-events/src/datasets/judge_prompt.ts`,
  ]) {
    assert.equal(classify([file(path)], member).tier, 'not_low', path);
  }
  // Tests of a judge are still tests.
  assert.equal(
    classify(
      [
        file(
          `${EVALS}/kbn-evals-suite-nightshift-investigations/evals/investigation/judges/scoring.test.ts`
        ),
      ],
      member
    ).tier,
    'low'
  );
});

test('instruction files for coding agents are not Low', () => {
  const result = classify(
    [file('x-pack/solutions/observability/plugins/significant_events/AGENTS.md')],
    member
  );
  assert.equal(result.tier, 'not_low');
});

test('one file outside Nightshift paths makes the PR not Low', () => {
  const result = classify([file(`${NI}/a.test.ts`), file('.github/CODEOWNERS')], member);
  assert.equal(result.tier, 'not_low');
  assert.match(result.reasons[0], /isn't owned only by `@elastic\/nightshift`/);
});

test('a rename counts both paths', () => {
  const result = classify(
    [
      file(`${NI}/server/a.test.ts`, '+ok', {
        status: 'renamed',
        previous_filename: `${NI}/server/a.ts`,
      }),
    ],
    member
  );
  assert.equal(result.tier, 'not_low');
});

test('deleting a test file is not Low', () => {
  const result = classify([file(`${NI}/a.test.ts`, '-gone', { status: 'removed' })], member);
  assert.match(result.reasons[0], /deletes a test file/);
});

test('skipping or focusing a test is not Low', () => {
  for (const patch of [
    "+  it.skip('x', () => {})",
    "+describe.only('x', () => {})",
    "+  xit('x')",
    // Scout spellings, from PRs 297943 and 299161.
    '+    apiTest.skip(',
    "+    apiTest.fixme('accepts TS', async () => {",
    "+test.describe.skip('x', () => {})",
  ]) {
    assert.equal(classify([file(`${NI}/a.test.ts`, patch)], member).tier, 'not_low', patch);
    assert.equal(
      classify([file(`${NI}/test/scout/api/a.spec.ts`, patch)], member).tier,
      'not_low',
      patch
    );
  }
  // A call that merely ends in "it" is not a test.
  assert.equal(classify([file(`${NI}/a.test.ts`, '+  submit.only(x)')], member).tier, 'low');
  // A removed skip is fine.
  assert.equal(classify([file(`${NI}/a.test.ts`, "-  it.skip('x')")], member).tier, 'low');
});

test('a generated Scout manifest has no owner, so it makes the PR not Low', () => {
  // Manifests can mark tests skipped as data (PR 289173); CODEOWNERS leaves them unowned.
  const manifest = `${NI}/test/scout_nightshift_investigations/.meta/api/standard.json`;
  const result = classify([file(`${NI}/a.test.ts`), file(manifest)], member);
  assert.equal(result.tier, 'not_low');
  assert.match(result.reasons[0], /standard\.json/);
});

test('a plugin added to CODEOWNERS is in scope without changing this script', () => {
  const path = 'x-pack/solutions/observability/plugins/nightshift_detection/server/a.test.ts';
  assert.equal(classify([file(path)], member).scope, 'none');
  const withNewPlugin = parseCodeowners(
    `${CODEOWNERS}\nx-pack/solutions/observability/plugins/nightshift_detection @elastic/nightshift\n`
  );
  assert.equal(classify([file(path)], { ...member, ownersOf: withNewPlugin }).tier, 'low');
});

test('CODEOWNERS parsing follows GitHub rules', () => {
  const owners = parseCodeowners(`
# a comment
*.md @elastic/docs
/src/ @elastic/core
/src/plugins/nightshift @elastic/nightshift
/src/plugins/nightshift/vendor
docs/* @elastic/docs-top
/x/**/fixtures/ @elastic/fixtures # trailing comment
`);
  assert.deepEqual(owners('README.md'), ['@elastic/docs']);
  assert.deepEqual(owners('src/a/b.md'), ['@elastic/core'], 'the last matching rule wins');
  assert.deepEqual(owners('src/plugins/nightshift/a.ts'), ['@elastic/nightshift']);
  assert.deepEqual(
    owners('src/plugins/nightshift/vendor/a.ts'),
    [],
    'a rule without owners unsets'
  );
  assert.deepEqual(
    owners('src/plugins/nightshift_extra/a.ts'),
    ['@elastic/core'],
    'no prefix match'
  );
  assert.deepEqual(owners('docs/a.txt'), ['@elastic/docs-top']);
  assert.deepEqual(owners('docs/deep/a.txt'), [], 'dir/* matches direct children only');
  assert.deepEqual(owners('x/a/b/fixtures/c.json'), ['@elastic/fixtures']);
  assert.deepEqual(owners('lib/a.ts'), []);
});

test('a test file with no diff to check is not Low', () => {
  // GitHub leaves out `patch` for large or binary diffs.
  const result = classify(
    [file(`${NI}/a.test.ts`, '+ok', { changes: 5000, patch: undefined })],
    member
  );
  assert.match(result.reasons[0], /no diff to check/);
});

test('a PR whose file list is truncated is not Low', () => {
  const result = classify([file(`${NI}/a.test.ts`)], { ...member, totalFiles: 4000 });
  assert.match(result.reasons[0], /could be listed/);
});

test('an author outside the org is not Low', () => {
  const result = classify([file(`${NI}/a.test.ts`)], {
    authorAssociation: 'CONTRIBUTOR',
    ownersOf,
  });
  assert.match(result.reasons[0], /not an Elastic org member/);
});

const createGithub = ({ files, comments = [] }) => {
  const calls = { added: [], removed: [], created: [], updated: [], deleted: [] };
  const github = {
    paginate: async (fn) => (fn === github.rest.pulls.listFiles ? files : comments),
    rest: {
      pulls: { listFiles: () => {} },
      issues: {
        listComments: () => {},
        addLabels: async (p) => calls.added.push(p.labels),
        removeLabel: async (p) => calls.removed.push(p.name),
        createComment: async (p) => calls.created.push(p.body),
        updateComment: async (p) => calls.updated.push(p.body),
        deleteComment: async (p) => calls.deleted.push(p.comment_id),
      },
    },
  };
  return { github, calls };
};

const contextFor = (labels = []) => ({
  repo: { owner: 'elastic', repo: 'kibana' },
  payload: {
    pull_request: { number: 1, changed_files: 1, author_association: 'MEMBER', labels },
  },
});
const core = { info: () => {} };

test('a Low PR gets the label and one comment', async () => {
  const { github, calls } = createGithub({ files: [file(`${NI}/a.test.ts`)] });
  await run({ github, context: contextFor(), core, codeowners: CODEOWNERS });
  assert.deepEqual(calls.added, [[LABEL]]);
  assert.equal(calls.created.length, 1);
  assert.match(calls.created[0], /Low\./);
});

test('a not-Low PR without an earlier comment stays quiet', async () => {
  const { github, calls } = createGithub({ files: [file(`${NI}/server/a.ts`)] });
  await run({ github, context: contextFor(), core, codeowners: CODEOWNERS });
  assert.deepEqual(calls, { added: [], removed: [], created: [], updated: [], deleted: [] });
});

test('a PR that stops being Low loses the label and its comment is updated', async () => {
  const { github, calls } = createGithub({
    files: [file(`${NI}/server/a.ts`)],
    comments: [{ id: 7, body: `old\n\n${MARKER}` }],
  });
  await run({ github, context: contextFor([{ name: LABEL }]), core, codeowners: CODEOWNERS });
  assert.deepEqual(calls.removed, [LABEL]);
  assert.equal(calls.updated.length, 1);
  assert.match(calls.updated[0], /not Low/);
});

test('a PR that drops all Nightshift files loses its comment', async () => {
  const { github, calls } = createGithub({
    files: [file('src/core/index.ts')],
    comments: [{ id: 7, body: `old\n\n${MARKER}` }],
  });
  await run({ github, context: contextFor([{ name: LABEL }]), core, codeowners: CODEOWNERS });
  assert.deepEqual(calls.removed, [LABEL]);
  assert.deepEqual(calls.deleted, [7]);
});

test('a PR with no Nightshift files and no label makes no API calls after listing files', async () => {
  const { github, calls } = createGithub({ files: [file('src/core/index.ts')] });
  let listed = 0;
  const paginate = github.paginate;
  github.paginate = async (fn, params) => {
    listed += 1;
    return paginate(fn, params);
  };
  await run({ github, context: contextFor(), core, codeowners: CODEOWNERS });
  assert.equal(listed, 1);
  assert.deepEqual(calls, { added: [], removed: [], created: [], updated: [], deleted: [] });
});
