/* eslint-disable jest/no-commented-out-tests */
import os from 'os';
import { resolve } from 'path';
import { Octokit } from '@octokit/rest';
import del = require('del');
import nock from 'nock';
import { getOptions } from '../options/options';
import { runSequentially } from '../runSequentially';
import { getCommits } from '../ui/getCommits';
import { mockConfigFiles } from './mockConfigFiles';
import { listenForCallsToNockScope } from './nockHelpers';
import { getDevAccessToken } from './private/getDevAccessToken';

jest.unmock('make-dir');
jest.unmock('del');
jest.setTimeout(10000);

const E2E_TEST_DATA_PATH = resolve(
  './src/test/tmp-mock-environments/backport-e2e'
);
const HOMEDIR_PATH = resolve(
  './src/test/tmp-mock-environments/backport-e2e/homedir'
);
const REPO_OWNER = 'backport-org';
const REPO_NAME = 'integration-test';
const BRANCH_WITH_ONE_COMMIT = 'backport/7.x/commit-5bf29b7d';
const BRANCH_WITH_TWO_COMMITS = 'backport/7.x/commit-5bf29b7d_pr-2';
const AUTHOR = 'sqren';

describe('backport e2e', () => {
  afterAll(() => {
    nock.cleanAll();
  });

  beforeAll(() => {
    // set alternative homedir
    jest.spyOn(os, 'homedir').mockReturnValue(HOMEDIR_PATH);

    mockConfigFiles({
      globalConfig: {},
      projectConfig: {},
    });
  });

  describe('when a single commit is backported', () => {
    let res: Awaited<ReturnType<typeof runSequentially>>;
    let accessToken: string;
    let createPullRequestsMockCalls: unknown[];

    beforeAll(async () => {
      accessToken = await getDevAccessToken();
      await resetState(accessToken);

      createPullRequestsMockCalls = mockCreatePullRequest({
        number: 1337,
        html_url: 'myHtmlUrl',
      });

      const options = await getOptions([], {
        accessToken,
        author: AUTHOR,
        ci: true,
        githubApiBaseUrlV3: 'https://api.foo.com',
        repoName: 'integration-test',
        repoOwner: 'backport-org',
        sha: '5bf29b7d847ea3dbde9280448f0f62ad0f22d3ad',
      });
      const commits = await getCommits(options);
      const targetBranches: string[] = ['7.x'];

      res = await runSequentially({ options, commits, targetBranches });
    });

    it('returns pull request', () => {
      expect(res).toEqual([
        {
          didUpdate: false,
          pullRequestUrl: 'myHtmlUrl',
          pullRequestNumber: 1337,
          status: 'success',
          targetBranch: '7.x',
        },
      ]);
    });

    it('sends the correct http body when creating pull request', () => {
      expect(createPullRequestsMockCalls).toMatchInlineSnapshot(`
        Array [
          Object {
            "base": "7.x",
            "body": "# Backport

        This is an automatic backport to \`7.x\` of:
         - Add ❤️ emoji (5bf29b7d)

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)",
            "head": "sqren:backport/7.x/commit-5bf29b7d",
            "title": "[7.x] Add ❤️ emoji",
          },
        ]
      `);
    });

    it('should not create new branches in origin (backport-org/integration-test)', async () => {
      const branches = await getBranches({
        accessToken,
        repoOwner: REPO_OWNER,
        repoName: REPO_NAME,
      });
      expect(branches.map((b) => b.name)).toEqual(['7.x', 'master']);
    });

    it('should create branch in the fork (sqren/integration-test)', async () => {
      const branches = await getBranches({
        accessToken,
        repoOwner: AUTHOR,
        repoName: REPO_NAME,
      });
      expect(branches.map((b) => b.name)).toEqual([
        '7.x',
        BRANCH_WITH_ONE_COMMIT,
        'master',
      ]);
    });
  });

  describe('when two commits are backported', () => {
    let createPullRequestsMockCalls: unknown[];
    let res: Awaited<ReturnType<typeof runSequentially>>;
    let accessToken: string;

    beforeAll(async () => {
      accessToken = await getDevAccessToken();
      await resetState(accessToken);

      createPullRequestsMockCalls = mockCreatePullRequest({
        number: 1337,
        html_url: 'myHtmlUrl',
      });

      const options = await getOptions([], {
        accessToken,
        author: AUTHOR,
        ci: true,
        githubApiBaseUrlV3: 'https://api.foo.com',
        repoName: 'integration-test',
        repoOwner: 'backport-org',
      });
      const commits = [
        ...(await getCommits({
          ...options,
          sha: '5bf29b7d847ea3dbde9280448f0f62ad0f22d3ad',
        })),
        ...(await getCommits({
          ...options,
          sha: '59d6ff1ca90a4ce210c0a4f0e159214875c19d60',
        })),
      ];

      const targetBranches: string[] = ['7.x'];
      res = await runSequentially({ options, commits, targetBranches });
    });

    it('contains both commits in the pull request body', () => {
      expect(createPullRequestsMockCalls).toMatchInlineSnapshot(`
        Array [
          Object {
            "base": "7.x",
            "body": "# Backport

        This is an automatic backport to \`7.x\` of:
         - Add ❤️ emoji (5bf29b7d)
         - #2

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)",
            "head": "sqren:backport/7.x/commit-5bf29b7d_pr-2",
            "title": "[7.x] Add ❤️ emoji | Add family emoji (#2)",
          },
        ]
      `);
    });

    it('returns the pull request response', () => {
      expect(res).toEqual([
        {
          didUpdate: false,
          pullRequestNumber: 1337,
          status: 'success',
          pullRequestUrl: 'myHtmlUrl',
          targetBranch: '7.x',
        },
      ]);
    });

    it('should not create new branches in origin (backport-org/integration-test)', async () => {
      const branches = await getBranches({
        accessToken,
        repoOwner: REPO_OWNER,
        repoName: REPO_NAME,
      });
      expect(branches.map((b) => b.name)).toEqual(['7.x', 'master']);
    });

    it('should create branch in the fork (sqren/integration-test)', async () => {
      const branches = await getBranches({
        accessToken,
        repoOwner: AUTHOR,
        repoName: REPO_NAME,
      });
      expect(branches.map((b) => b.name)).toEqual([
        '7.x',
        BRANCH_WITH_TWO_COMMITS,
        'master',
      ]);
    });
  });

  describe('when disabling fork mode', () => {
    let res: Awaited<ReturnType<typeof runSequentially>>;
    let accessToken: string;
    let createPullRequestsMockCalls: unknown[];

    beforeAll(async () => {
      accessToken = await getDevAccessToken();
      await resetState(accessToken);

      createPullRequestsMockCalls = mockCreatePullRequest({
        number: 1337,
        html_url: 'myHtmlUrl',
      });

      const options = await getOptions([], {
        accessToken,
        author: AUTHOR,
        ci: true,
        fork: false,
        githubApiBaseUrlV3: 'https://api.foo.com',
        repoName: 'integration-test',
        repoOwner: 'backport-org',
        sha: '5bf29b7d847ea3dbde9280448f0f62ad0f22d3ad',
      });
      const commits = await getCommits(options);
      const targetBranches: string[] = ['7.x'];

      res = await runSequentially({ options, commits, targetBranches });
    });

    it('sends the correct http body when creating pull request', () => {
      expect(createPullRequestsMockCalls).toMatchInlineSnapshot(`
        Array [
          Object {
            "base": "7.x",
            "body": "# Backport

        This is an automatic backport to \`7.x\` of:
         - Add ❤️ emoji (5bf29b7d)

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)",
            "head": "backport-org:backport/7.x/commit-5bf29b7d",
            "title": "[7.x] Add ❤️ emoji",
          },
        ]
      `);
    });

    it('returns pull request', () => {
      expect(res).toEqual([
        {
          didUpdate: false,
          pullRequestNumber: 1337,
          pullRequestUrl: 'myHtmlUrl',
          status: 'success',
          targetBranch: '7.x',
        },
      ]);
    });

    it('should create new branches in origin (backport-org/integration-test)', async () => {
      const branches = await getBranches({
        accessToken,
        repoOwner: REPO_OWNER,
        repoName: REPO_NAME,
      });
      expect(branches.map((b) => b.name)).toEqual([
        '7.x',
        BRANCH_WITH_ONE_COMMIT,
        'master',
      ]);
    });

    it('should NOT create branch in the fork (sqren/integration-test)', async () => {
      const branches = await getBranches({
        accessToken,
        repoOwner: AUTHOR,
        repoName: REPO_NAME,
      });
      expect(branches.map((b) => b.name)).toEqual(['7.x', 'master']);
    });
  });
});

function mockCreatePullRequest(response: { number: number; html_url: string }) {
  const scope = nock('https://api.foo.com', { allowUnmocked: true })
    .post('/repos/backport-org/integration-test/pulls')
    .reply(200, response);

  return listenForCallsToNockScope(scope);
}

async function getBranches({
  accessToken,
  repoOwner,
  repoName,
}: {
  accessToken: string;
  repoOwner: string;
  repoName: string;
}) {
  // console.log(`fetch branches for ${repoOwner}`);
  const octokit = new Octokit({
    auth: accessToken,
  });

  const res = await octokit.repos.listBranches({
    owner: repoOwner,
    repo: repoName,
  });

  return res.data;
}

async function deleteBranch({
  accessToken,
  repoOwner,
  repoName,
  branchName,
}: {
  accessToken: string;
  repoOwner: string;
  repoName: string;
  branchName: string;
}) {
  try {
    const octokit = new Octokit({
      auth: accessToken,
    });
    // console.log({ accessToken });

    const opts = {
      owner: repoOwner,
      repo: repoName,
      ref: `heads/${branchName}`,
    };

    const res = await octokit.git.deleteRef(opts);

    // console.log(`Deleted ${repoOwner}:heads/${branchName}`);

    return res.data;
  } catch (e) {
    // console.log(
    //   `Could not delete ${repoOwner}:heads/${branchName} (${e.message})`
    // );
    if (e.message === 'Reference does not exist') {
      return;
    }

    throw e;
  }
}

async function resetState(accessToken: string) {
  await deleteBranch({
    accessToken,
    repoOwner: REPO_OWNER,
    repoName: REPO_NAME,
    branchName: BRANCH_WITH_ONE_COMMIT,
  });

  await deleteBranch({
    accessToken,
    repoOwner: AUTHOR,
    repoName: REPO_NAME,
    branchName: BRANCH_WITH_ONE_COMMIT,
  });

  await deleteBranch({
    accessToken,
    repoOwner: AUTHOR,
    repoName: REPO_NAME,
    branchName: BRANCH_WITH_TWO_COMMITS,
  });

  await del(E2E_TEST_DATA_PATH);
}
