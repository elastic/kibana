import { spawn } from 'child_process';
import stripAnsi from 'strip-ansi';
import { getDevAccessToken } from './private/getDevAccessToken';

const TIMEOUT_IN_SECONDS = 10;

jest.setTimeout(15000);

describe('inquirer cli', () => {
  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
  });

  it('--version', async () => {
    const res = await runBackportAsync([`--version`]);
    expect(res).toContain(process.env.npm_package_version);
  });

  it('-v', async () => {
    const res = await runBackportAsync([`-v`]);
    expect(res).toContain(process.env.npm_package_version);
  });

  it('--help', async () => {
    const res = await runBackportAsync([`--help`]);
    expect(res).toContain('Show version number');
  });

  it('should return error when branch is missing', async () => {
    const res = await runBackportAsync([
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
    const res = await runBackportAsync([
      '--skip-remote-config',
      '--branch',
      'foo',
      '--accessToken',
      devAccessToken,
    ]);

    const lineCount = res.split('\n').length;
    expect(lineCount).toBeGreaterThan(10);

    expect(res.includes('Select commit (Use arrow keys)')).toBe(true);
  });

  it('should return error when access token is invalid', async () => {
    const res = await runBackportAsync([
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
    const res = await runBackportAsync([
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
    jest.setTimeout(TIMEOUT_IN_SECONDS * 1000 * 1.1);
    const output = await runBackportAsync(
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

  it(`should limit commits by since and until`, async () => {
    jest.setTimeout(TIMEOUT_IN_SECONDS * 1000 * 1.1);
    const output = await runBackportAsync(
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
        '2020-08-15T00:00:00.000Z',
        '--until',
        '2020-08-15T14:00:00.000Z',
      ],
      { waitForString: 'Select commit' }
    );

    expect(output).toMatchInlineSnapshot(`
      "? Select commit (Use arrow keys)
      ❯ 1. Add 🍏 emoji (#5) 7.x, 7.8
        2. Add family emoji (#2) 7.x
        3. Add \`backport\` dep
        4. Merge pull request #1 from backport-org/add-heart-emoji
        5. Update .backportrc.json
        6. Bump to 8.0.0
        7. Add package.json
        8. Update .backportrc.json
        9. Create .backportrc.json"
    `);
  });

  it(`should list commits from 7.x`, async () => {
    const output = await runBackportAsync(
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
});

function runBackportAsync(
  options: string[],
  {
    waitForString,
  }: {
    waitForString?: string;
  } = {}
) {
  const proc = spawn('./node_modules/.bin/ts-node', [
    '--transpile-only',
    './src/entrypoint.cli.ts',
    '--log-file-path',
    '/dev/null',
    ...options,
  ]);

  const p = new Promise<string>((resolve, reject) => {
    let data = '';

    // fail if expectations hasn't been found within 10 seconds
    const timeout = setTimeout(() => {
      reject(`Expectation '${waitForString}' not found within ${TIMEOUT_IN_SECONDS} seconds in:
      '${data.toString()}'`);
    }, TIMEOUT_IN_SECONDS * 1000);

    proc.stdout.on('data', (dataChunk) => {
      data += dataChunk;
      const output = data.toString();

      if (!waitForString || output.includes(waitForString)) {
        clearTimeout(timeout);
        // remove ansi codes and whitespace
        const strippedOutput = stripAnsi(output).replace(/\s+$/gm, '');

        resolve(strippedOutput);
      }
    });
  });

  // kill child process
  return p.finally(() => {
    proc.kill();
  });
}
