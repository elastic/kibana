import { resolve } from 'path';
import del from 'del';
import makeDir from 'make-dir';
import { ValidConfigOptions } from '../options/options';
import * as childProcess from './child-process-promisified';
import * as env from './env';
import { cherrypick, getIsCommitInBranch } from './git';
import { getShortSha } from './github/commitFormatters';

jest.unmock('make-dir');
jest.unmock('del');

const GIT_SANDBOX_DIR_PATH = resolve(`${__dirname}/git-test-temp`);

async function resetGitSandbox() {
  await del(GIT_SANDBOX_DIR_PATH);
  await makeDir(GIT_SANDBOX_DIR_PATH);

  // mock repo path to point to git-sandbox dir
  jest.spyOn(env, 'getRepoPath').mockReturnValue(GIT_SANDBOX_DIR_PATH);
}

async function createAndCommitFile({
  filename,
  content,
  execOpts,
}: {
  filename: string;
  content: string;
  execOpts: Record<string, string>;
}) {
  await childProcess.exec(`echo "${content}" > "${filename}"`, execOpts);
  await childProcess.exec(
    `git add -A && git commit -m 'Update ${filename}'`,
    execOpts
  );

  return getCurrentSha(execOpts);
}

async function getCurrentSha(execOpts: Record<string, string>) {
  const { stdout } = await childProcess.exec('git rev-parse HEAD', execOpts);
  return stdout.trim();
}

async function getCurrentMessage(execOpts: Record<string, string>) {
  const { stdout } = await childProcess.exec(
    'git --no-pager log -1 --pretty=%B',
    execOpts
  );
  return stdout.trim();
}

describe('git.integration', () => {
  describe('getIsCommitInBranch', () => {
    let firstSha: string;
    let secondSha: string;

    beforeEach(async () => {
      await resetGitSandbox();
      const execOpts = { cwd: GIT_SANDBOX_DIR_PATH };

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
        {} as ValidConfigOptions,
        firstSha
      );

      expect(isFirstCommitInBranch).toEqual(true);
    });

    it('should not contain the second commit', async () => {
      const isSecondCommitInBranch = await getIsCommitInBranch(
        {} as ValidConfigOptions,
        secondSha
      );

      expect(isSecondCommitInBranch).toEqual(false);
    });

    it('should not contain a random commit', async () => {
      const isSecondCommitInBranch = await getIsCommitInBranch(
        {} as ValidConfigOptions,
        'abcdefg'
      );

      expect(isSecondCommitInBranch).toEqual(false);
    });
  });

  describe('cherrypick', () => {
    let firstSha: string;
    let secondSha: string;
    let fourthSha: string;
    let execOpts: Record<string, string>;

    beforeEach(async () => {
      await resetGitSandbox();
      execOpts = { cwd: GIT_SANDBOX_DIR_PATH };

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
        cherrypick({} as ValidConfigOptions, firstSha)
      ).rejects.toThrowError(
        `Cherrypick failed because the selected commit (${shortSha}) is empty. Did you already backport this commit?`
      );
    });

    it('should cherrypick commit cleanly', async () => {
      const res = await cherrypick(
        { cherrypickRef: false } as ValidConfigOptions,
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
        { cherrypickRef: true } as ValidConfigOptions,
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
      const res = await cherrypick({} as ValidConfigOptions, fourthSha);
      expect(res).toEqual({
        needsResolving: true,
        conflictingFiles: [
          {
            absolute: `${GIT_SANDBOX_DIR_PATH}/foo.md`,
            relative: 'foo.md',
          },
        ],
        unstagedFiles: [`${GIT_SANDBOX_DIR_PATH}/foo.md`],
      });
    });
  });
});
