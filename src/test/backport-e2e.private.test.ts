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
const BRANCH_NAME = 'backport/7.x/commit-5bf29b7d';
const AUHTOR = 'sqren';

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
        githubApiBaseUrlV3: 'https://api.foo.com',
        ci: true,
        sha: '5bf29b7d847ea3dbde9280448f0f62ad0f22d3ad',
        author: AUHTOR,
        accessToken,
        repoOwner: 'backport-org',
        repoName: 'integration-test',
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
        repoOwner: AUHTOR,
        repoName: REPO_NAME,
      });
      expect(branches.map((b) => b.name)).toEqual([
        '7.x',
        BRANCH_NAME,
        'master',
      ]);
    });

    it('should have cherry picked the correct commit', async () => {
      const branches = await getBranches({
        accessToken,
        repoOwner: AUHTOR,
        repoName: REPO_NAME,
      });

      const sha = branches.find((branch) => branch.name === '7.x')?.commit.sha;
      expect(sha).toEqual('b68e4fcaaf4427fe1e902c718b3bb3f07b560fb5');
    });
  });

  // describe.skip('when two commits are backported', () => {
  //   let createPullRequestsMockCalls: unknown[];
  //   let res: Awaited<ReturnType<typeof runSequentially>>;
  //   let accessToken: string;

  //   beforeAll(async () => {
  //     accessToken = await getDevAccessToken();
  //     await resetState(accessToken);

  //     createPullRequestsMockCalls = mockCreatePullRequest({
  //       number: 1337,
  //       html_url: 'myHtmlUrl',
  //     });

  //     const options = {
  //       githubApiBaseUrlV3: 'https://api.foo.com',
  //       ci: true,
  //       sha: '5bf29b7d847ea3dbde9280448f0f62ad0f22d3ad',
  //       author: AUHTOR,
  //       accessToken,
  //       repoOwner: 'backport-org',
  //       reponame: 'integration-test',
  //     } as ValidConfigOptions;
  //     const commits = await getCommits(options);
  //     const targetBranches: string[] = ['7.x'];

  //     res = await runSequentially({ options, commits, targetBranches });
  //   });

  //   it('sends the correct http body when creating pull request', () => {
  //     expect(createPullRequestsMockCalls).toMatchInlineSnapshot();
  //   });

  //   it('returns pull request', () => {
  //     expect(res).toEqual([
  //       { pullRequestUrl: 'myHtmlUrl', success: true, targetBranch: '6.0' },
  //     ]);
  //   });

  //   it('should not create new branches in origin (backport-org/integration-test)', async () => {
  //     const branches = await getBranches({
  //       accessToken,
  //       repoOwner: REPO_OWNER,
  //       repoName: REPO_NAME,
  //     });
  //     expect(branches.map((b) => b.name)).toEqual(['7.x', '* master']);
  //   });

  //   it('should create branch in the fork (sqren/integration-test)', async () => {
  //     const branches = await getBranches({
  //       accessToken,
  //       repoOwner: AUHTOR,
  //       repoName: REPO_NAME,
  //     });
  //     expect(branches.map((b) => b.name)).toEqual([
  //       '7.x',
  //       'backport/6.0/pr-85_commit-2e63475c',
  //       'master',
  //     ]);
  //   });

  //   it('should have cherry picked the correct commit', async () => {
  //     const branches = await getBranches({
  //       accessToken,
  //       repoOwner: AUHTOR,
  //       repoName: REPO_NAME,
  //     });

  //     const sha = branches.find((branch) => branch.name === '7.x')?.commit.sha;
  //     expect(sha).toEqual('foo');
  //   });
  // });

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
        author: AUHTOR,
        githubApiBaseUrlV3: 'https://api.foo.com',
        ci: true,
        sha: '5bf29b7d847ea3dbde9280448f0f62ad0f22d3ad',
        accessToken,
        repoOwner: 'backport-org',
        repoName: 'integration-test',
        fork: false,
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
        BRANCH_NAME,
        'master',
      ]);
    });

    it('should NOT create branch in the fork (sqren/integration-test)', async () => {
      const branches = await getBranches({
        accessToken,
        repoOwner: AUHTOR,
        repoName: REPO_NAME,
      });
      expect(branches.map((b) => b.name)).toEqual(['7.x', 'master']);
    });

    it('should cherry pick the correct commit', async () => {
      const branches = await getBranches({
        accessToken,
        repoOwner: REPO_OWNER,
        repoName: REPO_NAME,
      });
      const sha = branches.find((branch) => branch.name === '7.x')?.commit.sha;
      expect(sha).toEqual('b68e4fcaaf4427fe1e902c718b3bb3f07b560fb5');
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
    branchName: BRANCH_NAME,
  });

  await deleteBranch({
    accessToken,
    repoOwner: AUHTOR,
    repoName: REPO_NAME,
    branchName: BRANCH_NAME,
  });

  await del(E2E_TEST_DATA_PATH);
}
