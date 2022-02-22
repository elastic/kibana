import { exec } from '../../../services/child-process-promisified';
import { getDevAccessToken } from '../../private/getDevAccessToken';
import { getSandboxPath, resetSandbox } from '../../sandbox';
import { runBackportViaCli } from './runBackportViaCli';
const accessToken = getDevAccessToken();

describe('different-merge-strategies', () => {
  it('list all commits regardless how they were merged', async () => {
    const output = await runBackportViaCli(
      [
        '--branch=foo',
        '--repo=backport-org/different-merge-strategies',
        `--accessToken=${accessToken}`,
        '-n=20',
      ],
      { waitForString: 'Select commit' }
    );

    expect(output).toMatchInlineSnapshot(`
        "? Select commit (Use arrow keys)
        ❯ 1. Merge pull request #9 from backport-org/many-merge-commits
          2. Merge strategy: Eighth of many merges
          3. Merge strategy: Seventh of many merges
          4. Merge strategy: Sixth of many merges
          5. Merge strategy: Fifth of many merges
          6. Merge strategy: Fourth of many merges
          7. Merge strategy: Third of many merges
          8. Merge strategy: Second of many merges
          9. Merge strategy: First of many merges
          10.Using squash to merge commits (#3) 7.x
          11.Rebase strategy: Second commit 7.x
          12.Rebase strategy: First commit
          13.Merge pull request #1 from backport-org/merge-strategy
          14.Merge strategy: Second commit
          15.Merge strategy: First commit
          16.Initial commit"
      `);
  });

  describe('when selecting a merge commit', () => {
    let output: string;
    let sandboxPath: string;
    beforeAll(async () => {
      sandboxPath = getSandboxPath({ filename: __filename });
      await resetSandbox(sandboxPath);

      output = await runBackportViaCli(
        [
          '--branch=7.x',
          '--repo=backport-org/different-merge-strategies',
          `--accessToken=${accessToken}`,
          `--dir=${sandboxPath}`,
          '--pr=9',
          '--dry-run',
        ],
        { waitForString: 'Dry run complete', showOra: true }
      );
    });

    it('runs to completion without errors', () => {
      expect(output).toMatchInlineSnapshot(`
        "- Initializing...
        ? Select pull request Merge pull request #9 from backport-org/many-merge-commits
        ✔ 100% Cloning repository from github.com (one-time operation)
        Backporting to 7.x:
        - Pulling latest changes
        ✔ Pulling latest changes
        - Cherry-picking: Merge pull request #9 from backport-org/many-merge-commits
        ✔ Cherry-picking: Merge pull request #9 from backport-org/many-merge-commits
        ✔ Dry run complete"
      `);
    });

    it('backports all immediate children of the merge commit', async () => {
      const commits = await listCommits(sandboxPath);
      expect(commits).toEqual([
        'Merge strategy: Eighth of many merges',
        'Merge strategy: Seventh of many merges',
        'Merge strategy: Sixth of many merges',
        'Merge strategy: Fifth of many merges',
        'Merge strategy: Fourth of many merges',
        'Merge strategy: Third of many merges',
        'Merge strategy: Second of many merges',
        'Merge strategy: First of many merges',
        'Initial commit',
      ]);
    });
  });

  describe('when selecting anoter merge commit', () => {
    let sandboxPath: string;
    beforeAll(async () => {
      sandboxPath = getSandboxPath({ filename: __filename });
      await resetSandbox(sandboxPath);
      await runBackportViaCli(
        [
          '--branch=7.x',
          '--repo=backport-org/different-merge-strategies',
          `--accessToken=${accessToken}`,
          `--dir=${sandboxPath}`,
          '--pr=1',
          '--dry-run',
        ],
        { waitForString: 'Dry run complete', showOra: true }
      );
    });

    it('backports all immediate children of the merge commit', async () => {
      const commits = await listCommits(sandboxPath);
      expect(commits).toEqual([
        'Merge strategy: Second commit',
        'Merge strategy: First commit',
        'Initial commit',
      ]);
    });
  });
});

async function listCommits(sandboxPath: string) {
  const { stdout } = await exec('git --no-pager log --pretty=format:%s', {
    cwd: sandboxPath,
  });

  return stdout.split('\n');
}
