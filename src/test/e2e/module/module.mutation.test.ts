import { Octokit } from '@octokit/rest';
import { BackportResponse, backportRun } from '../../../entrypoint.module';
import { getShortSha } from '../../../services/github/commitFormatters';
import { getDevAccessToken } from '../../private/getDevAccessToken';
import { getSandboxPath, resetSandbox } from '../../sandbox';

jest.unmock('find-up');
jest.unmock('del');
jest.unmock('make-dir');

jest.setTimeout(15000);

const accessToken = getDevAccessToken();
const octokit = new Octokit({ auth: accessToken });
const sandboxPath = getSandboxPath({ filename: __filename });

// repo
const REPO_OWNER = 'backport-org';
const REPO_NAME = 'integration-test';
const AUTHOR = 'sqren';

// commit 1
const COMMIT_SHA_1 = '5bf29b7d847ea3dbde9280448f0f62ad0f22d3ad';
const BRANCH_WITH_ONE_COMMIT = `backport/7.x/commit-${getShortSha(
  COMMIT_SHA_1
)}`;

// commit 2
const COMMIT_SHA_2 = '59d6ff1ca90a4ce210c0a4f0e159214875c19d60';
const BRANCH_WITH_TWO_COMMITS = `backport/7.x/commit-${getShortSha(
  COMMIT_SHA_1
)}_commit-${getShortSha(COMMIT_SHA_2)}`;

describe('backport e2e', () => {
  describe('when a single commit is backported', () => {
    let res: BackportResponse;
    let pullRequestResponse: Awaited<ReturnType<typeof octokit.pulls.get>>;

    beforeAll(async () => {
      await resetState(accessToken);
      res = await backportRun({
        dir: sandboxPath,
        accessToken,
        repoOwner: 'backport-org',
        repoName: 'integration-test',
        sha: COMMIT_SHA_1,
        targetBranches: ['7.x'],
      });

      // @ts-expect-error
      const pullRequestNumber = res.results[0].pullRequestNumber as number;

      pullRequestResponse = await octokit.pulls.get({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: pullRequestNumber,
      });
    });

    it('returns the backport result', () => {
      expect(res).toEqual({
        commits: [
          {
            author: { email: 'sorenlouv@gmail.com', name: 'Søren Louv-Jansen' },
            expectedTargetPullRequests: [],
            sourceBranch: 'master',
            sourceCommit: {
              committedDate: '2020-08-15T10:37:41Z',
              message: 'Add ❤️ emoji',
              sha: COMMIT_SHA_1,
            },
            sourcePullRequest: undefined,
          },
        ],
        results: [
          {
            didUpdate: false,
            pullRequestNumber: expect.any(Number),
            pullRequestUrl: expect.stringContaining(
              'https://github.com/backport-org/integration-test/pull/'
            ),
            status: 'success',
            targetBranch: '7.x',
          },
        ],
        status: 'success',
      } as BackportResponse);
    });

    it('pull request: status code', async () => {
      expect(pullRequestResponse.status).toEqual(200);
    });

    it('pull request: title', async () => {
      expect(pullRequestResponse.data.title).toEqual('[7.x] Add ❤️ emoji');
    });

    it('pull request: body', async () => {
      expect(pullRequestResponse.data.body).toMatchInlineSnapshot(`
        "# Backport

        This will backport the following commits from \`master\` to \`7.x\`:
         - Add ❤️ emoji (5bf29b7d)

        <!--- Backport version: 1.2.3-mocked -->

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
      `);
    });

    it('pull request: head branch is in fork repo', async () => {
      expect(pullRequestResponse.data.head.label).toEqual(
        `sqren:${BRANCH_WITH_ONE_COMMIT}`
      );
    });

    it('pull request: base branch', async () => {
      expect(pullRequestResponse.data.base.label).toEqual('backport-org:7.x');
    });

    it('does not create any new branches in origin (backport-org/integration-test)', async () => {
      const branches = await getBranchesOnGithub({
        accessToken,
        repoOwner: REPO_OWNER,
        repoName: REPO_NAME,
      });
      expect(branches.map((b) => b.name)).toEqual(['7.x', 'master']);
    });

    it('creates a branch in the fork (sqren/integration-test)', async () => {
      const branches = await getBranchesOnGithub({
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
    let res: BackportResponse;
    let pullRequestResponse: Awaited<ReturnType<typeof octokit.pulls.get>>;

    beforeAll(async () => {
      await resetState(accessToken);
      res = await backportRun({
        dir: sandboxPath,
        accessToken,
        repoOwner: 'backport-org',
        repoName: 'integration-test',
        sha: [COMMIT_SHA_1, COMMIT_SHA_2],
        targetBranches: ['7.x'],
      });

      // @ts-expect-error
      const pullRequestNumber = res.results[0].pullRequestNumber as number;

      pullRequestResponse = await octokit.pulls.get({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: pullRequestNumber,
      });
    });

    it('returns the backport result containing both commits', () => {
      expect(res).toEqual({
        commits: [
          {
            author: { email: 'sorenlouv@gmail.com', name: 'Søren Louv-Jansen' },
            expectedTargetPullRequests: [],
            sourceBranch: 'master',
            sourceCommit: {
              committedDate: '2020-08-15T10:37:41Z',
              message: 'Add ❤️ emoji',
              sha: COMMIT_SHA_1,
            },
            sourcePullRequest: undefined,
          },
          {
            author: { email: 'sorenlouv@gmail.com', name: 'Søren Louv-Jansen' },
            expectedTargetPullRequests: [],
            sourceBranch: 'master',
            sourceCommit: {
              committedDate: '2020-08-15T10:44:04Z',
              message: 'Add family emoji (#2)',
              sha: COMMIT_SHA_2,
            },
            sourcePullRequest: undefined,
          },
        ],
        results: [
          {
            didUpdate: false,
            pullRequestNumber: expect.any(Number),
            pullRequestUrl: expect.stringContaining(
              'https://github.com/backport-org/integration-test/pull/'
            ),
            status: 'success',
            targetBranch: '7.x',
          },
        ],
        status: 'success',
      } as BackportResponse);
    });

    it('pull request: status code', async () => {
      expect(pullRequestResponse.status).toEqual(200);
    });

    it('pull request: title', async () => {
      expect(pullRequestResponse.data.title).toEqual(
        '[7.x] Add ❤️ emoji | Add family emoji (#2)'
      );
    });

    it('pull request: body', async () => {
      expect(pullRequestResponse.data.body).toMatchInlineSnapshot(`
        "# Backport

        This will backport the following commits from \`master\` to \`7.x\`:
         - Add ❤️ emoji (5bf29b7d)
         - Add family emoji (#2) (59d6ff1c)

        <!--- Backport version: 1.2.3-mocked -->

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
      `);
    });

    it('pull request: head branch contains both commits in name', async () => {
      expect(pullRequestResponse.data.head.label).toEqual(
        `sqren:${BRANCH_WITH_TWO_COMMITS}`
      );
    });

    it('pull request: base branch', async () => {
      expect(pullRequestResponse.data.base.label).toEqual('backport-org:7.x');
    });
  });

  describe('when disabling fork mode', () => {
    let res: BackportResponse;
    let pullRequestResponse: Awaited<ReturnType<typeof octokit.pulls.get>>;

    beforeAll(async () => {
      await resetState(accessToken);
      res = await backportRun({
        fork: false,
        dir: sandboxPath,
        accessToken,
        repoOwner: 'backport-org',
        repoName: 'integration-test',
        sha: COMMIT_SHA_1,
        targetBranches: ['7.x'],
      });

      // @ts-expect-error
      const pullRequestNumber = res.results[0].pullRequestNumber as number;

      pullRequestResponse = await octokit.pulls.get({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: pullRequestNumber,
      });
    });

    it('pull request: title', async () => {
      expect(pullRequestResponse.data.title).toEqual('[7.x] Add ❤️ emoji');
    });

    it('pull request: body', async () => {
      expect(pullRequestResponse.data.body).toMatchInlineSnapshot(`
        "# Backport

        This will backport the following commits from \`master\` to \`7.x\`:
         - Add ❤️ emoji (5bf29b7d)

        <!--- Backport version: 1.2.3-mocked -->

        ### Questions ?
        Please refer to the [Backport tool documentation](https://github.com/sqren/backport)"
      `);
    });

    it('pull request: head branch is in origin (non-fork) repo', async () => {
      expect(pullRequestResponse.data.head.label).toEqual(
        `backport-org:${BRANCH_WITH_ONE_COMMIT}`
      );
    });

    it('pull request: base branch', async () => {
      expect(pullRequestResponse.data.base.label).toEqual('backport-org:7.x');
    });

    it('returns pull request', () => {
      expect(res).toEqual({
        commits: [
          {
            author: { email: 'sorenlouv@gmail.com', name: 'Søren Louv-Jansen' },
            expectedTargetPullRequests: [],
            sourceBranch: 'master',
            sourceCommit: {
              committedDate: '2020-08-15T10:37:41Z',
              message: 'Add ❤️ emoji',
              sha: COMMIT_SHA_1,
            },
            sourcePullRequest: undefined,
          },
        ],
        results: [
          {
            didUpdate: false,
            pullRequestNumber: expect.any(Number),
            pullRequestUrl: expect.stringContaining(
              'https://github.com/backport-org/integration-test/pull/'
            ),
            status: 'success',
            targetBranch: '7.x',
          },
        ],
        status: 'success',
      } as BackportResponse);
    });

    it('creates a new branch in origin (backport-org/integration-test)', async () => {
      const branches = await getBranchesOnGithub({
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

    it('does not create branches in the fork (sqren/integration-test)', async () => {
      const branches = await getBranchesOnGithub({
        accessToken,
        repoOwner: AUTHOR,
        repoName: REPO_NAME,
      });
      expect(branches.map((b) => b.name)).toEqual(['7.x', 'master']);
    });
  });
});

async function getBranchesOnGithub({
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

async function deleteBranchOnGithub({
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
  const ownerBranches = await getBranchesOnGithub({
    accessToken,
    repoOwner: REPO_OWNER,
    repoName: REPO_NAME,
  });

  // delete all branches except master and 7.x
  await Promise.all(
    ownerBranches
      .filter((b) => b.name !== 'master' && b.name !== '7.x')
      .map((b) => {
        return deleteBranchOnGithub({
          accessToken,
          repoOwner: REPO_OWNER,
          repoName: REPO_NAME,
          branchName: b.name,
        });
      })
  );

  const forkBranches = await getBranchesOnGithub({
    accessToken,
    repoOwner: AUTHOR,
    repoName: REPO_NAME,
  });

  // delete all branches except master and 7.x
  await Promise.all(
    forkBranches
      .filter((b) => b.name !== 'master' && b.name !== '7.x')
      .map((b) => {
        return deleteBranchOnGithub({
          accessToken,
          repoOwner: AUTHOR,
          repoName: REPO_NAME,
          branchName: b.name,
        });
      })
  );

  await resetSandbox(sandboxPath);
}
