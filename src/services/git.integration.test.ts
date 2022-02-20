import { access } from 'fs/promises';
import makeDir from 'make-dir';
import { ValidConfigOptions } from '../options/options';
import { mockGqlRequest } from '../test/nockHelpers';
import { getSandboxPath, resetSandbox } from '../test/sandbox';
import * as childProcess from './child-process-promisified';
import {
  cherrypick,
  cloneRepo,
  getCommitsInMergeCommit,
  getIsCommitInBranch,
  getSourceRepoPath,
  getIsMergeCommit,
} from './git';
import { getShortSha } from './github/commitFormatters';
import { RepoOwnerAndNameResponse } from './github/v4/getRepoOwnerAndNameFromGitRemotes';

jest.unmock('del');
jest.unmock('make-dir');

describe('git.integration', () => {
  describe('getIsCommitInBranch', () => {
    let firstSha: string;
    let secondSha: string;
    const sandboxPath = getSandboxPath({
      filename: __filename,
      specname: 'getIsCommitInBranch',
    });

    beforeEach(async () => {
      await resetSandbox(sandboxPath);
      const execOpts = { cwd: sandboxPath };

      // create and commit first file
      await childProcess.exec('git init', execOpts);
      firstSha = await createAndCommitFile({
        filename: 'foo.md',
        content: 'My first file',
        execOpts,
      });

      // create 7.x branch (but stay on `main` branch)
      await childProcess.exec('git branch 7.x', execOpts);

      // create and commit second file
      secondSha = await createAndCommitFile({
        filename: 'bar.md',
        content: 'My second file',
        execOpts,
      });

      // checkout 7.x
      await childProcess.exec('git checkout 7.x', execOpts);
    });

    it('should contain the first commit', async () => {
      const isFirstCommitInBranch = await getIsCommitInBranch(
        { dir: sandboxPath } as ValidConfigOptions,
        firstSha
      );

      expect(isFirstCommitInBranch).toEqual(true);
    });

    it('should not contain the second commit', async () => {
      const isSecondCommitInBranch = await getIsCommitInBranch(
        { dir: sandboxPath } as ValidConfigOptions,
        secondSha
      );

      expect(isSecondCommitInBranch).toEqual(false);
    });

    it('should not contain a random commit', async () => {
      const isSecondCommitInBranch = await getIsCommitInBranch(
        { dir: sandboxPath } as ValidConfigOptions,
        'abcdefg'
      );

      expect(isSecondCommitInBranch).toEqual(false);
    });
  });

  describe('cherrypick', () => {
    let firstSha: string;
    let secondSha: string;
    let fourthSha: string;
    let execOpts: { cwd: string };
    const sandboxPath = getSandboxPath({
      filename: __filename,
      specname: 'cherrypick',
    });

    beforeEach(async () => {
      await resetSandbox(sandboxPath);
      execOpts = { cwd: sandboxPath };

      // create and commit first file
      await childProcess.exec('git init', execOpts);
      firstSha = await createAndCommitFile({
        filename: 'foo.md',
        content: 'Creating first file',
        execOpts,
      });

      // create 7.x branch (but stay on `main` branch)
      await childProcess.exec('git branch 7.x', execOpts);

      // create and commit second file
      secondSha = await createAndCommitFile({
        filename: 'bar.md',
        content: 'Creating second file\nHello',
        execOpts,
      });

      // edit first file
      await createAndCommitFile({
        filename: 'foo.md',
        content: 'Changing first file',
        execOpts,
      });

      // edit first file
      fourthSha = await createAndCommitFile({
        filename: 'foo.md',
        content: 'Some more changes to the first file',
        execOpts,
      });

      // checkout 7.x
      await childProcess.exec('git checkout 7.x', execOpts);
    });

    it('should not cherrypick commit that already exists', async () => {
      const shortSha = getShortSha(firstSha);
      return expect(() =>
        cherrypick({ dir: sandboxPath } as ValidConfigOptions, firstSha)
      ).rejects.toThrowError(
        `Cherrypick failed because the selected commit (${shortSha}) is empty. Did you already backport this commit?`
      );
    });

    it('should cherrypick commit cleanly', async () => {
      const res = await cherrypick(
        {
          cherrypickRef: false,
          dir: sandboxPath,
        } as ValidConfigOptions,
        secondSha
      );
      expect(res).toEqual({
        conflictingFiles: [],
        needsResolving: false,
        unstagedFiles: [],
      });

      const message = await getCurrentMessage(execOpts);

      expect(message).toEqual(`Update bar.md`);
    });

    it('should cherrypick commit cleanly and append "(cherry picked from commit...)"', async () => {
      const res = await cherrypick(
        {
          cherrypickRef: true,
          dir: sandboxPath,
        } as ValidConfigOptions,
        secondSha
      );
      expect(res).toEqual({
        conflictingFiles: [],
        needsResolving: false,
        unstagedFiles: [],
      });

      const message = await getCurrentMessage(execOpts);

      expect(message).toEqual(
        `Update bar.md\n\n(cherry picked from commit ${secondSha})`
      );
    });

    it('should cherrypick commit with conflicts', async () => {
      const res = await cherrypick(
        { dir: sandboxPath } as ValidConfigOptions,
        fourthSha
      );
      expect(res).toEqual({
        needsResolving: true,
        conflictingFiles: [
          {
            absolute: `${sandboxPath}/foo.md`,
            relative: 'foo.md',
          },
        ],
        unstagedFiles: [`${sandboxPath}/foo.md`],
      });
    });
  });

  describe('cloneRepo', () => {
    const sandboxPath = getSandboxPath({
      filename: __filename,
      specname: 'cloneRepo',
    });
    const sourceRepo = `${sandboxPath}/source-repo`;
    const backportRepo = `${sandboxPath}/backport-repo`;

    beforeEach(async () => {
      await resetSandbox(sandboxPath);
      await makeDir(sourceRepo);

      const execOpts = { cwd: sourceRepo };
      await childProcess.exec(`git init`, execOpts);
      await childProcess.exec(
        `git remote add origin git@github.com:elastic/kibana.git`,
        execOpts
      );

      await createAndCommitFile({
        filename: 'my-file.txt',
        content: 'Hello!',
        execOpts,
      });
    });

    it('clones the repo', async () => {
      // file should not exist before clone
      await expect(() =>
        access(`${backportRepo}/my-file.txt`)
      ).rejects.toThrowError();

      await cloneRepo(
        { sourcePath: sourceRepo, targetPath: backportRepo },
        () => null
      );

      //file should exist after clone
      await expect(() =>
        access(`${backportRepo}/my-file.txt`)
      ).not.toThrowError();
    });
  });

  describe('getSourceRepoPath', () => {
    let sourceRepo: string;

    beforeEach(async () => {
      const sandboxPath = getSandboxPath({
        filename: __filename,
        specname: 'getSourceRepoPath',
      });
      sourceRepo = `${sandboxPath}/source-repo`;

      await resetSandbox(sandboxPath);
      await makeDir(sourceRepo);

      const execOpts = { cwd: sourceRepo };
      await childProcess.exec(`git init`, execOpts);
      await childProcess.exec(
        `git remote add origin git@github.com:elastic/kibana.git`,
        execOpts
      );

      mockRepoOwnerAndName({
        childRepoOwner: 'sqren',
        parentRepoOwner: 'elastic',
        repoName: 'kibana',
      });
    });

    it('returns local source repo, when one remote matches', async () => {
      const options = {
        accessToken: 'verysecret',
        repoName: 'kibana',
        repoOwner: 'elastic',
        cwd: sourceRepo,
        githubApiBaseUrlV4: 'http://localhost/graphql', // required to mock the response
      } as ValidConfigOptions;

      expect(await getSourceRepoPath(options)).toBe(sourceRepo);
    });

    it("returns remote source repo when remotes don't match", async () => {
      const options = {
        accessToken: 'verysecret',
        repoName: 'kibana',
        repoOwner: 'not-a-match',
        cwd: sourceRepo,
        githubApiBaseUrlV4: 'http://localhost/graphql', // required to mock the response
      } as ValidConfigOptions;

      expect(await getSourceRepoPath(options)).toBe(
        'https://x-access-token:verysecret@github.com/not-a-match/kibana.git'
      );
    });
  });

  describe('when cloning "backport-org/different-merge-strategies"', () => {
    const MERGE_COMMIT_HASH_1 = 'bdc5a17f81e5f32129e27b05c742e055c650bc54';
    const MERGE_COMMIT_HASH_2 = '0db7f1ac1233461563d8708511d1c14adbab46da';
    const SQUASH_COMMIT_HASH = '74a76fa64b34e3ffe8f2a3f73840e1b42fd07299';
    const REBASE_COMMIT_HASH = '9059ae0ca31caa2eebc035f2542842d6c2fde83b';

    let sandboxPath: string;
    beforeAll(async () => {
      sandboxPath = getSandboxPath({
        filename: __filename,
        specname: 'different-merge-strategies',
      });
      await resetSandbox(sandboxPath);

      await childProcess.exec(
        'git clone https://github.com/backport-org/different-merge-strategies.git ./',
        { cwd: sandboxPath }
      );
    });

    describe('getIsMergeCommit', () => {
      it('returns true for first merge commit', async () => {
        const res = await getIsMergeCommit(
          { dir: sandboxPath } as ValidConfigOptions,
          MERGE_COMMIT_HASH_1
        );

        expect(res).toBe(true);
      });

      it('returns true for second merge commit', async () => {
        const res = await getIsMergeCommit(
          { dir: sandboxPath } as ValidConfigOptions,
          MERGE_COMMIT_HASH_2
        );

        expect(res).toBe(true);
      });

      it('returns false for rebased commits', async () => {
        const res = await getIsMergeCommit(
          { dir: sandboxPath } as ValidConfigOptions,
          REBASE_COMMIT_HASH
        );

        expect(res).toBe(false);
      });

      it('returns false for squashed commits', async () => {
        const res = await getIsMergeCommit(
          { dir: sandboxPath } as ValidConfigOptions,
          SQUASH_COMMIT_HASH
        );

        expect(res).toBe(false);
      });
    });

    describe('getCommitsInMergeCommit', () => {
      it('returns a list of commit hashes - excluding the merge hash itself', async () => {
        const res = await getCommitsInMergeCommit(
          { dir: sandboxPath } as ValidConfigOptions,
          MERGE_COMMIT_HASH_1
        );

        expect(res).not.toContain(MERGE_COMMIT_HASH_1);

        expect(res).toEqual([
          'f9a760e0d9eb3ebcc64f8cb75ce885714b836496',
          '7b92e29e88266004485ce0fae0260605b01df887',
          'a1facf8c006fb815d6a6ecd1b2907e6e64f29576',
          'b8d4bcfb0fd875be4ab0230f6db40ddf72f45378',
          '6f224054db5f7772b04f23f17659070216bae84c',
          '7fed54cbd1ba9cb973462670ff82ac80bf8a79f8',
          '78c24d0058859e7d511d10ce91ebf279c7b58ac2',
          '709ccf707d443dd8c001b3c3ae40fdf037bb43f5',
        ]);
      });

      it('returns empty for squash commits', async () => {
        const res = await getCommitsInMergeCommit(
          { dir: sandboxPath } as ValidConfigOptions,
          SQUASH_COMMIT_HASH
        );

        expect(res).toEqual([]);
      });
    });
  });
});

async function createAndCommitFile({
  filename,
  content,
  execOpts,
}: {
  filename: string;
  content: string;
  execOpts: { cwd: string };
}) {
  await childProcess.exec(`echo "${content}" > "${filename}"`, execOpts);
  await childProcess.exec(
    `git add -A && git commit -m 'Update ${filename}'`,
    execOpts
  );

  return getCurrentSha(execOpts);
}

async function getCurrentSha(execOpts: { cwd: string }) {
  const { stdout } = await childProcess.exec('git rev-parse HEAD', execOpts);
  return stdout.trim();
}

async function getCurrentMessage(execOpts: { cwd: string }) {
  const { stdout } = await childProcess.exec(
    'git --no-pager log -1 --pretty=%B',
    execOpts
  );
  return stdout.trim();
}

function mockRepoOwnerAndName({
  repoName,
  parentRepoOwner,
  childRepoOwner,
}: {
  repoName: string;
  childRepoOwner: string;
  parentRepoOwner?: string;
}) {
  return mockGqlRequest<RepoOwnerAndNameResponse>({
    name: 'RepoOwnerAndName',
    statusCode: 200,
    body: {
      data: {
        // @ts-expect-error
        repository: {
          isFork: !!parentRepoOwner,
          name: repoName,
          owner: {
            login: childRepoOwner,
          },
          parent: parentRepoOwner
            ? {
                owner: {
                  login: parentRepoOwner,
                },
              }
            : null,
        },
      },
    },
  });
}
