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
//   node --test .github/scripts/flaky_fix_review_reminder.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const reminder = require('./flaky_fix_review_reminder');

const NOW = new Date('2026-08-18T12:00:00Z').getTime();
const iso = (d) => new Date(d).toISOString();

// Hermetic CODEOWNERS fixture covering the precedence rules we rely on.
const CODEOWNERS_FIXTURE = [
  'src/core @elastic/kibana-core',
  'x-pack/plugins/security_solution @elastic/security-solution',
  'x-pack/plugins/security_solution/public/integrations @elastic/cloud-services',
  '*.md @elastic/docs-team',
].join('\n');

test('daysBetween counts whole calendar days', () => {
  assert.equal(reminder.daysBetween('2026-08-14T12:00:00Z', NOW), 4);
  assert.equal(reminder.daysBetween('2026-08-14T13:00:00Z', NOW), 3);
  assert.equal(reminder.daysBetween('2026-08-18T00:00:00Z', NOW), 0);
});

test('laterOf returns the more recent timestamp, tolerating null', () => {
  assert.equal(reminder.laterOf(null, '2026-01-01'), '2026-01-01');
  assert.equal(reminder.laterOf('2026-01-01', null), '2026-01-01');
  assert.equal(reminder.laterOf('2026-01-02', '2026-01-01'), '2026-01-02');
  assert.equal(reminder.laterOf('2026-01-01', '2026-01-03'), '2026-01-03');
});

test('resolveOwners applies last-matching-entry-wins precedence', () => {
  const entries = reminder.buildCodeownersEntries(CODEOWNERS_FIXTURE);

  assert.deepEqual(reminder.resolveOwners(entries, ['src/core/server/index.ts']), [
    '@elastic/kibana-core',
  ]);
  // Broad security_solution owner...
  assert.deepEqual(
    reminder.resolveOwners(entries, ['x-pack/plugins/security_solution/public/app.tsx']),
    ['@elastic/security-solution']
  );
  // ...overridden by the more specific nested integrations owner.
  assert.deepEqual(
    reminder.resolveOwners(entries, [
      'x-pack/plugins/security_solution/public/integrations/cribl/form.test.tsx',
    ]),
    ['@elastic/cloud-services']
  );
  // Extension rule listed later wins over the directory rule.
  assert.deepEqual(
    reminder.resolveOwners(entries, ['x-pack/plugins/security_solution/README.md']),
    ['@elastic/docs-team']
  );
});

test('resolveOwners de-duplicates owners across multiple files', () => {
  const entries = reminder.buildCodeownersEntries(CODEOWNERS_FIXTURE);
  const owners = reminder.resolveOwners(entries, [
    'src/core/a.ts',
    'src/core/b.ts',
    'x-pack/plugins/security_solution/public/app.tsx',
  ]);
  assert.deepEqual(owners, ['@elastic/kibana-core', '@elastic/security-solution']);
});

test('buildCommentBody mentions the owners and includes the marker', () => {
  const body = reminder.buildCommentBody(['@elastic/kibana-core', '@elastic/docs-team']);
  assert.match(body, /@elastic\/kibana-core @elastic\/docs-team/);
  assert.ok(body.includes(reminder.REMINDER_MARKER));
  assert.ok(body.includes('@copilot'));
});

// --- Full sweep integration against a mocked Octokit -----------------------

function makeGithub(state) {
  const paginate = (fn, params) => fn(params).then((r) => r.data);
  return {
    paginate,
    rest: {
      repos: { get: async () => ({ data: { default_branch: 'main' } }) },
      issues: {
        listForRepo: async () => ({ data: state.candidates }),
        listEventsForTimeline: async ({ issue_number: issueNumber }) => ({
          data: state.timeline[issueNumber] || [],
        }),
        listComments: async ({ issue_number: issueNumber }) => ({
          data: state.comments[issueNumber] || [],
        }),
        createComment: async (args) => {
          state.posted.push(args);
          return { data: {} };
        },
      },
      pulls: {
        get: async ({ pull_number: pullNumber }) => ({ data: state.prs[pullNumber] }),
        listReviews: async ({ pull_number: pullNumber }) => ({
          data: state.reviews[pullNumber] || [],
        }),
        listFiles: async ({ pull_number: pullNumber }) => ({
          data: (state.files[pullNumber] || []).map((filename) => ({ filename })),
        }),
      },
    },
  };
}

function scenarioState() {
  const flaky = [{ name: 'flaky-test-fixer' }];
  const bot = { login: 'kibanamachine', type: 'Bot' };
  const openPr = (number, overrides) => ({
    number,
    draft: false,
    base: { ref: 'main' },
    state: 'open',
    user: bot,
    created_at: iso('2026-08-01'),
    labels: flaky,
    ...overrides,
  });

  return {
    posted: [],
    candidates: [
      { number: 1, pull_request: {} }, // due, never pinged
      { number: 2, pull_request: {} }, // human review -> skip
      { number: 3, pull_request: {} }, // draft -> skip
      { number: 4, pull_request: {} }, // not yet due -> skip
      { number: 5, pull_request: {} }, // last ping 4d ago -> re-ping
      { number: 6, pull_request: {} }, // non-default base -> skip
      { number: 7 }, // an issue, not a PR -> skip
    ],
    prs: {
      1: openPr(1, { created_at: iso('2026-08-10') }),
      2: openPr(2),
      3: openPr(3, { draft: true }),
      4: openPr(4, { created_at: iso('2026-08-16') }),
      5: openPr(5),
      6: openPr(6, { base: { ref: '8.19' } }),
    },
    reviews: {
      // A bot COMMENTED review must NOT suppress reminders for #1.
      1: [{ state: 'COMMENTED', user: { login: 'elastic-vault[bot]', type: 'Bot' } }],
      2: [{ state: 'APPROVED', user: { login: 'dev', type: 'User' } }],
    },
    timeline: {
      1: [{ event: 'ready_for_review', created_at: iso('2026-08-13') }],
      4: [{ event: 'ready_for_review', created_at: iso('2026-08-16') }],
      5: [{ event: 'ready_for_review', created_at: iso('2026-08-05') }],
    },
    comments: {
      // #5 was already pinged by us 4 days ago -> due for a re-ping.
      5: [
        {
          user: { login: 'kibanamachine' },
          body: `...\n${reminder.REMINDER_MARKER}`,
          created_at: iso('2026-08-14'),
        },
      ],
    },
    files: {
      1: ['x-pack/plugins/security_solution/public/app.tsx'],
      5: ['src/core/server/index.ts'],
    },
  };
}

function withFixtureAndNow(fn) {
  const codeownersPath = path.join(os.tmpdir(), `codeowners-${process.pid}-${Math.random()}`);
  fs.writeFileSync(codeownersPath, CODEOWNERS_FIXTURE);
  const realNow = Date.now;
  Date.now = () => NOW;
  process.env.CODEOWNERS_PATH = codeownersPath;
  return Promise.resolve(fn()).finally(() => {
    Date.now = realNow;
    delete process.env.CODEOWNERS_PATH;
    fs.rmSync(codeownersPath, { force: true });
  });
}

const context = { repo: { owner: 'elastic', repo: 'kibana' } };
const silentCore = { info() {}, warning() {} };

test('a PR whose files resolve no codeowners is not pinged', async () => {
  await withFixtureAndNow(async () => {
    const state = scenarioState();
    state.files[1] = ['totally/unowned/path.xyz'];
    process.env.DRY_RUN = 'false';
    await reminder({ github: makeGithub(state), context, core: silentCore });

    assert.ok(!state.posted.some((c) => c.issue_number === 1));
    // Other due PRs are unaffected.
    assert.ok(state.posted.some((c) => c.issue_number === 5));
  });
});

test('sweep pings the first due, ready, unreviewed PR with its codeowners', async () => {
  await withFixtureAndNow(async () => {
    const state = scenarioState();
    process.env.DRY_RUN = 'false';
    await reminder({ github: makeGithub(state), context, core: silentCore });

    // #1 is the first due PR; the cap of MAX_PINGS_PER_RUN stops the run there.
    const posted = state.posted.map((c) => c.issue_number);
    assert.deepEqual(posted, [1]);
    assert.match(state.posted[0].body, /@elastic\/security-solution/);
  });
});

test('a PR already pinged 4+ days ago is re-pinged', async () => {
  await withFixtureAndNow(async () => {
    const state = scenarioState();
    // Take #1 out of the running so the re-ping candidate #5 is reached.
    state.reviews[1] = [{ state: 'APPROVED', user: { login: 'dev', type: 'User' } }];
    process.env.DRY_RUN = 'false';
    await reminder({ github: makeGithub(state), context, core: silentCore });

    const posted = state.posted.map((c) => c.issue_number);
    assert.deepEqual(posted, [5]);
    assert.match(state.posted[0].body, /@elastic\/kibana-core/);
  });
});

test('dry run logs intentions without commenting', async () => {
  await withFixtureAndNow(async () => {
    const state = scenarioState();
    const logs = [];
    process.env.DRY_RUN = 'true';
    await reminder({
      github: makeGithub(state),
      context,
      core: { info: (m) => logs.push(m), warning() {} },
    });

    assert.equal(state.posted.length, 0);
    assert.ok(logs.some((l) => l.includes('[dry run] would ping #1')));
  });
});

test('a spoofed marker from a non-bot user does not suppress reminders', async () => {
  await withFixtureAndNow(async () => {
    const state = scenarioState();
    // A human drops the marker text 1 day ago; it must be ignored so #1 still pings.
    state.comments[1] = [
      {
        user: { login: 'random-dev' },
        body: `looks fine ${reminder.REMINDER_MARKER}`,
        created_at: iso('2026-08-17'),
      },
    ];
    process.env.DRY_RUN = 'false';
    await reminder({ github: makeGithub(state), context, core: silentCore });

    assert.ok(state.posted.some((c) => c.issue_number === 1));
  });
});

test('pings per run are capped at MAX_PINGS_PER_RUN', async () => {
  await withFixtureAndNow(async () => {
    const state = scenarioState();
    // Add enough due PRs to exceed the cap by one.
    const extra = reminder.MAX_PINGS_PER_RUN + 1 - 2; // #1 and #5 are already due
    for (let i = 0; i < extra; i++) {
      const number = 100 + i;
      state.candidates.push({ number, pull_request: {} });
      state.prs[number] = { ...state.prs[1], number };
      state.reviews[number] = [];
      state.timeline[number] = [{ event: 'ready_for_review', created_at: iso('2026-08-12') }];
      state.files[number] = ['src/core/server/index.ts'];
    }

    process.env.DRY_RUN = 'false';
    await reminder({ github: makeGithub(state), context, core: silentCore });

    assert.equal(state.posted.length, reminder.MAX_PINGS_PER_RUN);
  });
});
