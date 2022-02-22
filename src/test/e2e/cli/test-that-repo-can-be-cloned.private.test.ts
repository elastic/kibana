import { exec } from '../../../services/child-process-promisified';
import { getDevAccessToken } from '../../private/getDevAccessToken';
import { getSandboxPath, resetSandbox } from '../../sandbox';
import { runBackportViaCli } from './runBackportViaCli';
const accessToken = getDevAccessToken();

describe('test-that-repo-can-be-cloned', () => {
  describe('when local repo does not exist', () => {
    let sandboxPath: string;
    beforeAll(async () => {
      sandboxPath = getSandboxPath({ filename: __filename });
      await resetSandbox(sandboxPath);
    });

    function run() {
      return runBackportViaCli(
        [
          '--repo=backport-org/test-that-repo-can-be-cloned',
          '--branch=foo',
          '--pr=1',
          `--dir=${sandboxPath}`,
          '--dry-run',
          `--accessToken=${accessToken}`,
        ],
        { showOra: true, waitForString: 'Backporting to foo:' }
      );
    }

    it('clones the repo remote repo', async () => {
      const output = await run();

      expect(output).toContain('Cloning repository from github.com');
      expect(output).toMatchInlineSnapshot(`
        "- Initializing...
        ? Select pull request Beginning of a beautiful repo (#1)
        ✔ 100% Cloning repository from github.com (one-time operation)
        Backporting to foo:"
      `);
    });

    it('does not clone again on subsequent runs', async () => {
      const output = await run();

      expect(output).not.toContain('Cloning repository from github.com');
      expect(output).toMatchInlineSnapshot(`
        "- Initializing...
        ? Select pull request Beginning of a beautiful repo (#1)
        Backporting to foo:"
      `);
    });
  });

  describe('when local repo exists', () => {
    let sourceRepo: string;
    let backportRepo: string;
    beforeEach(async () => {
      const sandboxPath = getSandboxPath({ filename: __filename });
      await resetSandbox(sandboxPath);
      sourceRepo = `${sandboxPath}/source`;
      backportRepo = `${sandboxPath}/backport`;

      await exec(
        `git clone https://github.com/backport-org/test-that-repo-can-be-cloned.git ${sourceRepo}`,
        { cwd: sandboxPath }
      );
    });

    function run() {
      return runBackportViaCli(
        [
          '--branch=foo',
          '--pr=1',
          `--dir=${backportRepo}`,
          '--dry-run',
          `--accessToken=${accessToken}`,
        ],
        {
          cwd: sourceRepo,
          showOra: true,
          waitForString: 'Backporting to foo:',
        }
      );
    }

    it('clones using the local repo', async () => {
      const output = await run();

      expect(output).toEqual(
        expect.stringMatching(
          /100% Cloning repository from .*\/src\/test\/_tmp_sandbox_\/test-that-repo-can-be-cloned.private.test\/source \(one-time operation\)/gm
        )
      );
    });
  });
});
