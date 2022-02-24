import fs from 'fs/promises';
import { ConfigFileOptions } from '../../../entrypoint.module';
import { exec } from '../../../services/child-process-promisified';
import { getDevAccessToken } from '../../private/getDevAccessToken';
import { getSandboxPath, resetSandbox } from '../../sandbox';
import { runBackportViaCli } from './runBackportViaCli';

const accessToken = getDevAccessToken();

describe('commit author', () => {
  let sourceRepo: string;
  let backportRepo: string;
  beforeEach(async () => {
    const sandboxPath = getSandboxPath({ filename: __filename });
    await resetSandbox(sandboxPath);
    sourceRepo = `${sandboxPath}/sourceRepo`;
    backportRepo = `${sandboxPath}/backportRepo`;

    await exec(
      `git clone https://github.com/backport-org/commit-author.git ${sourceRepo}`,
      { cwd: sandboxPath }
    );

    await fs.writeFile(
      `${sandboxPath}/.backportrc.json`,
      JSON.stringify({
        repoName: 'commit-author',
        repoOwner: 'backport-org',
      } as ConfigFileOptions)
    );
  });

  // eslint-disable-next-line jest/no-commented-out-tests
  // it('use commit author from source commit', async () => {
  //   await runBackportViaCli(
  //     [
  //       `--accessToken=${accessToken}`,
  //       `--dir=${backportRepo}`,
  //       '--branch=production',
  //       '--pr=2',
  //       '--dry-run',
  //     ],
  //     { waitForString: 'Dry run complete', cwd: sourceRepo, showOra: true }
  //   );

  //   const { authorEmail, authorName } = await getCommitAuthor({
  //     cwd: backportRepo,
  //   });

  //   expect(authorName).toEqual('Sonny Long (demo)');
  //   expect(authorEmail).toEqual('71195571+sqren-demo@users.noreply.github.com');
  // });

  it('use commit author from git config in source repo', async () => {
    await exec(`git config user.name "Peter Kanin"`, { cwd: sourceRepo });
    await exec(`git config user.email "kanin@zoo.dk"`, { cwd: sourceRepo });

    await runBackportViaCli(
      [
        `--accessToken=${accessToken}`,
        `--dir=${backportRepo}`,
        '--branch=production',
        '--pr=2',
        '--dry-run',
      ],
      { waitForString: 'Dry run complete', cwd: sourceRepo, showOra: true }
    );

    const { authorEmail, authorName } = await getCommitAuthor({
      cwd: backportRepo,
    });

    expect(authorName).toEqual('Peter Kanin');
    expect(authorEmail).toEqual('kanin@zoo.dk');
  });

  it('use commit author from cli args', async () => {
    await runBackportViaCli(
      [
        `--accessToken=${accessToken}`,
        `--dir=${backportRepo}`,
        '--branch=production',
        '--pr=2',
        '--dry-run',
        '--gitAuthorName="Donald Duck"',
        '--gitAuthorEmail=duck@disney.com',
      ],
      { waitForString: 'Dry run complete', cwd: sourceRepo, showOra: true }
    );

    const { authorEmail, authorName } = await getCommitAuthor({
      cwd: backportRepo,
    });

    expect(authorName).toEqual('Donald Duck');
    expect(authorEmail).toEqual('duck@disney.com');
  });

  it('use resetAuthor option to set current user as author of commit', async () => {
    await runBackportViaCli(
      [
        `--accessToken=${accessToken}`,
        `--dir=${backportRepo}`,
        '--branch=production',
        '--pr=2',
        '--dry-run',
        '--reset-author',
      ],
      { waitForString: 'Dry run complete', cwd: sourceRepo, showOra: true }
    );

    const { authorEmail, authorName } = await getCommitAuthor({
      cwd: backportRepo,
    });

    expect(authorName).toEqual('sqren');
    expect(authorEmail).toEqual('sqren@users.noreply.github.com');
  });
});

async function getCommitAuthor({ cwd }: { cwd: string }) {
  const { stdout: authorName } = await exec(
    'git --no-pager log -1 --format=format:"%cn"',
    { cwd }
  );

  const { stdout: authorEmail } = await exec(
    'git --no-pager log -1 --format=format:"%ce"',
    { cwd }
  );

  return { authorName, authorEmail };
}
