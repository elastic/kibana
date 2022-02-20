import { spawn } from 'child_process';
import path from 'path';
import stripAnsi from 'strip-ansi';
import { exec } from '../../services/child-process-promisified';
import * as packageVersion from '../../utils/packageVersion';
import { getDevAccessToken } from '../private/getDevAccessToken';
import { getSandboxPath, resetSandbox } from '../sandbox';

const TIMEOUT_IN_SECONDS = 15;
jest.setTimeout(TIMEOUT_IN_SECONDS * 1000);
const devAccessToken = getDevAccessToken();

describe('inquirer cli', () => {
  it('--version', async () => {
    const res = await runBackportViaCli([`--version`], {
      showLoadingSpinner: true,
    });
    expect(res).toEqual(process.env.npm_package_version);
  });

  it('-v', async () => {
    const res = await runBackportViaCli([`-v`], {
      showLoadingSpinner: true,
    });
    expect(res).toEqual(process.env.npm_package_version);
  });

  it('PACKAGE_VERSION should match', async () => {
    // @ts-expect-error
    expect(packageVersion.UNMOCKED_PACKAGE_VERSION).toBe(
      process.env.npm_package_version
    );
  });

  it('--help', async () => {
    const res = await runBackportViaCli([`--help`]);
    expect(res).toMatchInlineSnapshot(`
      "entrypoint.cli.ts [args]
      Options:
        -v, -V, --version                     Show version number                                [boolean]
            --accessToken, --accesstoken      Github access token                                 [string]
        -a, --all                             List all commits                                   [boolean]
            --assignee, --assign              Add assignees to the target pull request             [array]
            --autoAssign                      Auto assign the target pull request to yourself    [boolean]
            --autoMerge                       Enable auto-merge for created pull requests        [boolean]
            --autoMergeMethod                 Sets auto-merge method when using --auto-merge. Default:
                                              merge        [string] [choices: \\"merge\\", \\"rebase\\", \\"squash\\"]
            --ci                              Disable interactive prompts                        [boolean]
            --cherrypickRef                   Append commit message with \\"(cherry picked from commit...)
                                                                                                 [boolean]
            --configFile, --config            Path to project config                              [string]
            --since                           ISO-8601 date for filtering commits                 [string]
            --until                           ISO-8601 date for filtering commits                 [string]
            --dir                             Location where the temporary repository will be stored
                                                                                                  [string]
            --details                         Show details about each commit                     [boolean]
            --dryRun                          Run backport locally without pushing to Github     [boolean]
            --editor                          Editor to be opened during conflict resolution      [string]
            --skipRemoteConfig                Use local .backportrc.json config instead of loading from
                                              Github                                             [boolean]
            --fork                            Create backports in fork or origin repo            [boolean]
            --mainline                        Parent id of merge commit. Defaults to 1 when supplied
                                              without arguments                                   [number]
        -n, --maxNumber, --number             Number of commits to choose from                    [number]
            --multiple                        Select multiple branches/commits                   [boolean]
            --multipleBranches                Backport to multiple branches                      [boolean]
            --multipleCommits                 Backport multiple commits                          [boolean]
            --noCherrypickRef                 Do not append commit message with \\"(cherry picked from
                                              commit...)\\"                                        [boolean]
            --noStatusComment                 Don't publish status comment to Github             [boolean]
            --noVerify                        Bypass the pre-commit and commit-msg hooks         [boolean]
            --noFork                          Create backports in the origin repo                [boolean]
        -p, --path                            Only list commits touching files under the specified path
                                                                                                   [array]
            --prDescription, --description    Description to be added to pull request             [string]
            --prTitle, --title                Title of pull request                               [string]
            --prFilter                        Filter source pull requests by a query              [string]
            --pullNumber, --pr                Pull request to backport                            [number]
            --resetAuthor                     Set yourself as commit author                      [boolean]
            --reviewer                        Add reviewer to the target PR                        [array]
            --repoOwner                       Repository owner                                    [string]
            --repoName                        Repository name                                     [string]
            --repo                            Repo owner and name                                 [string]
            --sha, --commit                   Commit sha to backport                              [string]
            --sourceBranch                    Specify a non-default branch (normally \\"master\\") to backport
                                              from                                                [string]
            --sourcePRLabel, --sourcePrLabel  Add labels to the source (original) PR               [array]
        -b, --targetBranch, --branch          Branch(es) to backport to                            [array]
            --targetBranchChoice              List branches to backport to                         [array]
        -l, --targetPRLabel, --label          Add labels to the target (backport) PR               [array]
            --username                        Defaults to the authenticated user                  [string]
            --verbose                         Show additional debug information                  [boolean]
            --verify                          Opposite of no-verify                              [boolean]
            --help                            Show help                                          [boolean]
      For bugs, feature requests or questions: https://github.com/sqren/backport/issues
      Or contact me directly: https://twitter.com/sorenlouv"
    `);
  });

  it('should return error when branch is missing', async () => {
    const res = await runBackportViaCli([
      '--skip-remote-config',
      '--repo-owner',
      'backport-org',
      '--repo-name',
      'backport-e2e',
      '--accessToken',
      devAccessToken,
    ]);
    expect(res).toMatchInlineSnapshot(`
      "Please specify a target branch: \\"--branch 6.1\\".
      Read more: https://github.com/sqren/backport/blob/main/docs/configuration.md#project-config-backportrcjson"
    `);
  });

  it('should list commits based on .git/config when `repoOwner`/`repoName` is missing', async () => {
    const sandboxPath = getSandboxPath({ filename: __filename });
    await resetSandbox(sandboxPath);
    await exec(`git init`, { cwd: sandboxPath });
    await exec(
      `git remote add origin git@github.com:backport-org/backport-e2e.git`,
      { cwd: sandboxPath }
    );

    const res = await runBackportViaCli(['--accessToken', devAccessToken], {
      cwd: sandboxPath,
      waitForString: 'Select commit',
    });

    expect(res).toMatchInlineSnapshot(`
      "? Select commit (Use arrow keys)
      ❯ 1. Add sheep emoji (#9) 7.8
        2. Change Ulysses to Gretha (conflict) (#8) 7.x
        3. Add 🍏 emoji (#5) 7.x, 7.8
        4. Add family emoji (#2) 7.x
        5. Add \`backport\` dep
        6. Merge pull request #1 from backport-org/add-heart-emoji
        7. Add ❤️ emoji
        8. Update .backportrc.json
        9. Bump to 8.0.0
        10.Add package.json"
    `);
  });

  it('should return error when access token is invalid', async () => {
    const res = await runBackportViaCli([
      '--branch',
      'foo',
      '--repo-owner',
      'foo',
      '--repo-name',
      'bar',
      '--accessToken',
      'some-token',
    ]);
    expect(res).toContain(
      'Please check your access token and make sure it is valid'
    );
  });

  it(`should return error when repo doesn't exist`, async () => {
    const res = await runBackportViaCli([
      '--branch',
      'foo',
      '--repo-owner',
      'foo',
      '--repo-name',
      'bar',
      '--author',
      'sqren',
      '--accessToken',
      devAccessToken,
    ]);
    expect(res).toMatchInlineSnapshot(
      `"The repository \\"foo/bar\\" doesn't exist"`
    );
  });

  it(`should list commits from master`, async () => {
    const output = await runBackportViaCli(
      [
        '--branch',
        'foo',
        '--repo-owner',
        'backport-org',
        '--repo-name',
        'backport-e2e',
        '--author',
        'sqren',
        '--accessToken',
        devAccessToken,
        '--max-number',
        '6',
      ],
      { waitForString: 'Select commit' }
    );

    expect(output).toMatchInlineSnapshot(`
      "? Select commit (Use arrow keys)
      ❯ 1. Add sheep emoji (#9) 7.8
        2. Change Ulysses to Gretha (conflict) (#8) 7.x
        3. Add 🍏 emoji (#5) 7.x, 7.8
        4. Add family emoji (#2) 7.x
        5. Add \`backport\` dep
        6. Merge pull request #1 from backport-org/add-heart-emoji"
    `);
  });

  it(`should filter commits by "since" and "until"`, async () => {
    const output = await runBackportViaCli(
      [
        '--branch',
        'foo',
        '--repo-owner',
        'backport-org',
        '--repo-name',
        'backport-e2e',
        '--accessToken',
        devAccessToken,
        '--since',
        '2020-08-15T10:00:00.000Z',
        '--until',
        '2020-08-15T10:30:00.000Z',
      ],
      { waitForString: 'Select commit' }
    );

    expect(output).toMatchInlineSnapshot(`
      "? Select commit (Use arrow keys)
      ❯ 1. Bump to 8.0.0
        2. Add package.json
        3. Update .backportrc.json
        4. Create .backportrc.json"
    `);
  });

  it(`should list commits from 7.x`, async () => {
    const output = await runBackportViaCli(
      [
        '--branch',
        'foo',
        '--repo-owner',
        'backport-org',
        '--repo-name',
        'backport-e2e',
        '--author',
        'sqren',
        '--accessToken',
        devAccessToken,
        '--max-number',
        '6',
        '--source-branch',
        '7.x',
      ],
      { waitForString: 'Select commit' }
    );

    expect(output).toMatchInlineSnapshot(`
      "? Select commit (Use arrow keys)
      ❯ 1. Add 🍏 emoji (#5) (#6)
        2. Change Ulysses to Carol
        3. Add family emoji (#2) (#4)
        4. Update .backportrc.json
        5. Branch off: 7.9.0 (7.x)
        6. Bump to 8.0.0"
    `);
  });

  describe('repo: repo-with-backportrc-removed (missing .backportrc.json config file)', () => {
    it('should list commits', async () => {
      const output = await runBackportViaCli(
        [
          '--branch',
          'foo',
          '--repo',
          'backport-org/repo-with-backportrc-removed',
          '--accessToken',
          devAccessToken,
        ],
        { waitForString: 'Select commit' }
      );

      expect(output).toMatchInlineSnapshot(`
        "? Select commit (Use arrow keys)
        ❯ 1. Rename README.me to README.md
          2. Merge pull request #1 from backport-org/add-readme
          3. Create README.me
          4. Delete .backportrc.json
          5. Create .backportrc.json
          6. Delete .backportrc.json
          7. Create .backportrc.json"
      `);
    });

    it('should attempt to backport by PR', async () => {
      const output = await runBackportViaCli(
        [
          '--branch',
          'foo',
          '--repo',
          'backport-org/repo-with-backportrc-removed',
          '--pr',
          '1',
          '--accessToken',
          devAccessToken,
        ],
        { waitForString: "is invalid or doesn't exist" }
      );

      expect(output).toMatchInlineSnapshot(`
        "
        Backporting to foo:
        The branch \\"foo\\" is invalid or doesn't exist"
      `);
    });

    it('should attempt to backport by commit sha', async () => {
      const output = await runBackportViaCli(
        [
          '--branch',
          'foo',
          '--repo',
          'backport-org/repo-with-backportrc-removed',
          '--sha',
          'be59df6912a550c8cb49ba3e18be3e512f3d608c',
          '--accessToken',
          devAccessToken,
        ],
        { waitForString: `Backporting to foo:` }
      );

      expect(output).toMatchInlineSnapshot(`
        "
        Backporting to foo:"
      `);
    });
  });

  describe('repo: different-merge-strategies', () => {
    it('list all commits regardless how they were merged', async () => {
      const output = await runBackportViaCli(
        [
          '--branch',
          'foo',
          '--repo-owner',
          'backport-org',
          '--repo-name',
          'different-merge-strategies',
          '--accessToken',
          devAccessToken,
          '-n',
          '20',
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
  });

  describe('repo: test-that-repo-can-be-cloned', () => {
    let sandboxPath: string;
    beforeAll(async () => {
      sandboxPath = getSandboxPath({
        filename: __filename,
        specname: 'test-cloning',
      });
      await resetSandbox(sandboxPath);
    });

    function run() {
      return runBackportViaCli(
        [
          '--repo',
          'backport-org/test-that-repo-can-be-cloned',
          '--branch',
          'foo',
          '--pr',
          '1',
          '--dir',
          sandboxPath,
          '--dry-run',
          '--accessToken',
          devAccessToken,
        ],
        { showLoadingSpinner: true, waitForString: 'Backporting to foo:' }
      );
    }

    it('clones the repo on the very first run', async () => {
      const output = await run();

      expect(output).toContain('Cloning repository from github.com');
      expect(output).toMatchInlineSnapshot(`
        "- Initializing...
        ? Select pull request Beginning of a beautiful repo (#1)
        ✔ 100% Cloning repository from github.com (one-time operation)
        Backporting to foo:"
      `);
    });

    it('does not clone the repo on subsequent runs', async () => {
      const output = await run();

      expect(output).not.toContain('Cloning repository from github.com');
      expect(output).toMatchInlineSnapshot(`
        "- Initializing...
        ? Select pull request Beginning of a beautiful repo (#1)
        Backporting to foo:"
      `);
    });
  });
});

function runBackportViaCli(
  cliArgs: string[],
  {
    showLoadingSpinner,
    waitForString,
    cwd,
  }: {
    showLoadingSpinner?: boolean;
    waitForString?: string;
    cwd?: string;
  } = {}
) {
  const tsNodeBinary = path.resolve('./node_modules/.bin/ts-node');
  const entrypointFile = path.resolve('./src/entrypoint.cli.ts');

  const proc = spawn(
    tsNodeBinary,
    [
      '--transpile-only',
      entrypointFile,
      '--log-file-path',
      '/dev/null',
      ...cliArgs,
    ],
    { cwd }
  );

  const p = new Promise<string>((resolve, reject) => {
    let data = '';

    // fail if expectations hasn't been found within 10 seconds
    const timeout = setTimeout(() => {
      reject(`Expectation '${waitForString}' not found within ${TIMEOUT_IN_SECONDS} seconds in:
      '${data.toString()}'`);
    }, TIMEOUT_IN_SECONDS * 1000);

    proc.stdout.on('data', (chunk) => {
      data += chunk;
      const rawOutput = data.toString();

      // remove ansi codes and whitespace
      const output = stripAnsi(rawOutput).replace(/\s+$/gm, '');

      if (!waitForString || output.includes(waitForString)) {
        clearTimeout(timeout);

        resolve(output);
      }
    });

    // ora (loading spinner) is redirected to stderr
    if (showLoadingSpinner) {
      proc.stderr.on('data', (chunk) => {
        data += chunk;
      });
    }

    proc.on('error', (err) => {
      reject(`runBackportViaCli failed with: ${err}`);
    });
  });

  // kill child process
  return p.finally(() => {
    proc.kill();
  });
}
