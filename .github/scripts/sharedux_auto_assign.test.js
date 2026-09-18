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
//   node --test .github/scripts/sharedux_auto_assign.test.js

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const autoAssign = require('./sharedux_auto_assign');
const { buildCodeownersEntries } = require('./codeowners');

const TEAM = autoAssign.TEAM_HANDLE;
const MAX = autoAssign.MAX_CHANGED_LINES;

const CODEOWNERS_FIXTURE = [
  `src/platform/plugins/shared/share ${TEAM}`,
  `src/platform/plugins/shared/share/server/legacy @elastic/kibana-core`,
  `src/core/packages/chrome ${TEAM} @elastic/kibana-core`,
  `/x-pack/platform/test/functional/page_objects/user_menu.ts ${TEAM} # inline comment`,
  `x-pack/platform/plugins/shared/spaces @elastic/kibana-security`,
  `*.md @elastic/docs-team`,
].join('\n');

const entries = buildCodeownersEntries(CODEOWNERS_FIXTURE);
const file = (filename, additions, deletions = 0) => ({ filename, additions, deletions });

test('measureOwnedChanges only counts files whose last matching owner is the team', () => {
  const result = autoAssign.measureOwnedChanges(entries, [
    file('src/platform/plugins/shared/share/public/app.tsx', 10, 5),
    file('src/platform/plugins/shared/share/server/legacy/old.ts', 100, 100),
    file('src/core/packages/chrome/browser/src/index.ts', 3, 1),
    file('x-pack/platform/test/functional/page_objects/user_menu.ts', 2),
    file('x-pack/platform/plugins/shared/spaces/public/index.ts', 500),
    file('src/platform/plugins/shared/share/README.md', 40),
    file('totally/unowned/path.xyz', 999),
  ]);
  assert.deepEqual(result, { changedLines: 21, ownedFiles: 3 });
});

test('measureOwnedChanges reports zero for PRs without team-owned files', () => {
  const result = autoAssign.measureOwnedChanges(entries, [
    file('x-pack/platform/plugins/shared/spaces/public/index.ts', 1),
  ]);
  assert.deepEqual(result, { changedLines: 0, ownedFiles: 0 });
});

test('pickNextAssignee prefers never-assigned members, then the least recently assigned', () => {
  assert.equal(
    autoAssign.pickNextAssignee(
      new Map([
        ['zed', '2026-09-01T00:00:00Z'],
        ['amy', '2026-08-01T00:00:00Z'],
        ['bob', null],
      ])
    ),
    'bob'
  );
  assert.equal(
    autoAssign.pickNextAssignee(
      new Map([
        ['zed', '2026-09-01T00:00:00Z'],
        ['amy', '2026-08-01T00:00:00Z'],
      ])
    ),
    'amy'
  );
});

test('pickNextAssignee breaks ties alphabetically and handles no candidates', () => {
  assert.equal(
    autoAssign.pickNextAssignee(
      new Map([
        ['zed', null],
        ['amy', null],
      ])
    ),
    'amy'
  );
  assert.equal(autoAssign.pickNextAssignee(new Map()), undefined);
});

// --- Full run against a mocked Octokit --------------------------------------

function makeGithub(state) {
  const paginate = (fn, params) => fn(params).then((r) => r.data);
  return {
    paginate,
    rest: {
      pulls: {
        listFiles: async () => ({ data: state.files }),
      },
      teams: {
        listMembersInOrg: async () => {
          if (state.teamError) throw state.teamError;
          return { data: state.members };
        },
      },
      search: {
        issuesAndPullRequests: async ({ q }) => {
          state.searches.push(q);
          const login = q.match(/assignee:(\S+)/)[1];
          const at = state.lastAssigned[login];
          return { data: { items: at ? [{ created_at: at }] : [] } };
        },
      },
      issues: {
        addAssignees: async (args) => {
          state.assigned.push(args);
          return { data: {} };
        },
      },
    },
  };
}

function scenarioState() {
  return {
    assigned: [],
    searches: [],
    files: [file('src/platform/plugins/shared/share/public/app.tsx', 10, 5)],
    members: [
      { login: 'amy', type: 'User' },
      { login: 'bob', type: 'User' },
      { login: 'cat', type: 'User' },
      { login: 'sharedux-bot[bot]', type: 'Bot' },
      ...autoAssign.EXCLUDED_LOGINS.map((login) => ({ login, type: 'User' })),
    ],
    lastAssigned: {
      amy: '2026-09-01T00:00:00Z',
      bob: '2026-08-01T00:00:00Z',
      cat: '2026-08-15T00:00:00Z',
    },
  };
}

const makeContext = (prOverrides = {}) => ({
  repo: { owner: 'elastic', repo: 'kibana' },
  payload: {
    pull_request: {
      number: 42,
      draft: false,
      user: { login: 'someone', type: 'User' },
      assignees: [],
      ...prOverrides,
    },
  },
});

function withFixture(fn) {
  const codeownersPath = path.join(os.tmpdir(), `codeowners-${process.pid}-${Math.random()}`);
  fs.writeFileSync(codeownersPath, CODEOWNERS_FIXTURE);
  process.env.CODEOWNERS_PATH = codeownersPath;
  process.env.DRY_RUN = 'false';
  return Promise.resolve(fn()).finally(() => {
    delete process.env.CODEOWNERS_PATH;
    delete process.env.DRY_RUN;
    fs.rmSync(codeownersPath, { force: true });
  });
}

const silentCore = { info() {}, warning() {} };

test('a simple PR is assigned to the least recently assigned team member', async () => {
  await withFixture(async () => {
    const state = scenarioState();
    await autoAssign({ github: makeGithub(state), context: makeContext(), core: silentCore });

    assert.deepEqual(state.assigned, [
      { owner: 'elastic', repo: 'kibana', issue_number: 42, assignees: ['bob'] },
    ]);
    // Bots and excluded members are never candidates, so no search is issued for them.
    assert.ok(state.searches.every((q) => !q.includes('sharedux-bot')));
    for (const login of autoAssign.EXCLUDED_LOGINS) {
      assert.ok(
        state.searches.every((q) => !q.includes(`assignee:${login}`)),
        login
      );
    }
    assert.ok(state.searches.every((q) => q.includes('-author:')));
  });
});

test('the PR author is never assigned to their own PR', async () => {
  await withFixture(async () => {
    const state = scenarioState();
    await autoAssign({
      github: makeGithub(state),
      context: makeContext({ user: { login: 'bob', type: 'User' } }),
      core: silentCore,
    });

    assert.equal(state.assigned[0].assignees[0], 'cat');
  });
});

test('a PR at the threshold is assigned, one line above is not', async () => {
  await withFixture(async () => {
    const atLimit = scenarioState();
    atLimit.files = [file('src/platform/plugins/shared/share/public/app.tsx', MAX - 30, 30)];
    await autoAssign({ github: makeGithub(atLimit), context: makeContext(), core: silentCore });
    assert.equal(atLimit.assigned.length, 1);

    const aboveLimit = scenarioState();
    aboveLimit.files = [file('src/platform/plugins/shared/share/public/app.tsx', MAX - 30, 31)];
    await autoAssign({
      github: makeGithub(aboveLimit),
      context: makeContext(),
      core: silentCore,
    });
    assert.equal(aboveLimit.assigned.length, 0);
    assert.equal(aboveLimit.searches.length, 0);
  });
});

test('large changes in files owned by other teams do not count against the threshold', async () => {
  await withFixture(async () => {
    const state = scenarioState();
    state.files.push(file('x-pack/platform/plugins/shared/spaces/public/index.ts', 5000, 2000));
    await autoAssign({ github: makeGithub(state), context: makeContext(), core: silentCore });
    assert.equal(state.assigned.length, 1);
  });
});

test('a PR with no team-owned files is left alone', async () => {
  await withFixture(async () => {
    const state = scenarioState();
    state.files = [file('x-pack/platform/plugins/shared/spaces/public/index.ts', 1)];
    await autoAssign({ github: makeGithub(state), context: makeContext(), core: silentCore });
    assert.equal(state.assigned.length, 0);
  });
});

test('drafts, bot authors, and already-assigned PRs are skipped', async () => {
  await withFixture(async () => {
    for (const overrides of [
      { draft: true },
      { user: { login: 'kibanamachine', type: 'Bot' } },
      { user: { login: 'renovate[bot]', type: 'User' } },
      { assignees: [{ login: 'amy' }] },
    ]) {
      const state = scenarioState();
      await autoAssign({
        github: makeGithub(state),
        context: makeContext(overrides),
        core: silentCore,
      });
      assert.equal(state.assigned.length, 0, JSON.stringify(overrides));
    }
  });
});

test('a failed team lookup warns and skips instead of throwing', async () => {
  await withFixture(async () => {
    const state = scenarioState();
    state.teamError = Object.assign(new Error('Not Found'), { status: 404 });
    const warnings = [];
    await autoAssign({
      github: makeGithub(state),
      context: makeContext(),
      core: { info() {}, warning: (m) => warnings.push(m) },
    });
    assert.equal(state.assigned.length, 0);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /read:org/);
  });
});

test('dry run logs the would-be assignee without assigning', async () => {
  await withFixture(async () => {
    const state = scenarioState();
    const logs = [];
    process.env.DRY_RUN = 'true';
    await autoAssign({
      github: makeGithub(state),
      context: makeContext(),
      core: { info: (m) => logs.push(m), warning() {} },
    });
    assert.equal(state.assigned.length, 0);
    assert.ok(logs.some((l) => l.includes('[dry run] would assign #42') && l.includes('bob')));
  });
});
