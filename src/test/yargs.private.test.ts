import { execSync, spawn } from 'child_process';
import stripAnsi from 'strip-ansi';

const execOptions = {
  stdio: 'pipe',
  encoding: 'utf-8',
} as const;

// get global config: either from .backport/config.json or via env variables
function getGlobalConfig() {
  return JSON.parse(
    execSync(
      `./node_modules/.bin/ts-node --transpile-only ./src/test/getGlobalConfig.ts`,
      execOptions
    )
  );
}

describe('yargs', () => {
  let accessToken: string;
  let username: string;

  beforeAll(() => {
    const config = getGlobalConfig();

    accessToken = config.accessToken;
    username = config.username;

    if (!username || !accessToken) {
      throw new Error('username or accessToken is missing');
    }
  });

  it('--version', () => {
    const res = runBackport(`--version`);
    expect(res).toContain(process.env.npm_package_version);
  });

  it('-v', () => {
    const res = runBackport(`-v`);
    expect(res).toContain(process.env.npm_package_version);
  });

  it('--help', () => {
    const res = runBackport(`--help`);
    expect(res).toContain('Show version number');
  });

  it('should return error when branch is missing', () => {
    const res = runBackport(
      `--upstream foo --username ${username} --accessToken ${accessToken}`
    );
    expect(res).toMatchInlineSnapshot(`
      "You must specify a target branch

      You can specify it via either:
       - Config file (recommended): \\".backportrc.json\\". Read more: https://github.com/sqren/backport/blob/434a28b431bb58c9a014d4489a95f561e6bb2769/docs/configuration.md#project-config-backportrcjson
       - CLI: \\"--branch 6.1\\"
      "
    `);
  });

  it('should return error when upstream is missing', () => {
    const res = runBackport(
      `--branch foo --username ${username} --accessToken ${accessToken}`
    );
    expect(res).toMatchInlineSnapshot(`
      "You must specify a valid Github repository

      You can specify it via either:
       - Config file (recommended): \\".backportrc.json\\". Read more: https://github.com/sqren/backport/blob/434a28b431bb58c9a014d4489a95f561e6bb2769/docs/configuration.md#project-config-backportrcjson
       - CLI: \\"--upstream elastic/kibana\\"
      "
    `);
  });

  it('should return error when access token is invalid', () => {
    const res = runBackport(
      `--branch foo --upstream foo/bar  --username some-user --accessToken some-token`
    );
    expect(res).toContain(
      'Please check your access token and make sure it is valid'
    );
  });

  it(`should return error when repo doesn't exist`, () => {
    const res = runBackport(
      `--branch foo --upstream foo/bar --username ${username} --accessToken ${accessToken}`
    );
    expect(res).toMatchInlineSnapshot(`
      "The repository \\"foo/bar\\" doesn't exist
      "
    `);
  });

  it(`should list commits from master`, async () => {
    const output = await runBackportAsync([
      '--branch',
      'foo',
      '--upstream',
      'sqren/backport-demo',
      '--username',
      username,
      '--accessToken',
      accessToken,
      '--author',
      'sqren',
      '--max-number',
      '6',
    ]);

    expect(output).toMatchInlineSnapshot(`
      "? Select commit (Use arrow keys)
      ❯ 1. Create \\"conflicting-file.txt\\" in master (f8bb8b70)
        2. Update romeo-and-juliet.txt (91eee967)
        3. Add 👻 (2e63475c)
        4. Add witch (#85)
        5. Add SF mention (#80) 6.3
        6. Add backport config (3827bbba)
        ──────────────"
    `);
  });

  it(`should list commits from 7.x`, async () => {
    const output = await runBackportAsync([
      '--branch',
      'foo',
      '--upstream',
      'sqren/backport-demo',
      '--username',
      username,
      '--accessToken',
      accessToken,
      '--author',
      'sqren',
      '--max-number',
      '6',
      '--source-branch',
      '7.x',
    ]);

    expect(output).toMatchInlineSnapshot(`
      "? Select commit (Use arrow keys)
      ❯ 1. Change to be forwardported (#181)
        2. Create \\"conflicting-file.txt\\" in master (72f94e76)
        3. Update romeo-and-juliet.txt (91eee967)
        4. Add 👻 (2e63475c)
        5. Add witch (#85)
        6. Add SF mention (#80) 6.3
        ──────────────"
    `);
  });
});

function runBackport(args: string) {
  const cmd = `./node_modules/.bin/ts-node --transpile-only ./src/index.ts ${args}`;
  return execSync(cmd, execOptions);
}

function runBackportAsync(options: string[]) {
  const proc = spawn('./node_modules/.bin/ts-node', [
    '--transpile-only',
    './src/index.ts',
    ...options,
  ]);

  return new Promise<string>((resolve) => {
    let data = '';

    proc.stdout.on('data', (dataChunk) => {
      data += dataChunk;
      const output = data.toString();
      if (output.includes('Select commit')) {
        // remove ansi codes and whitespace
        resolve(stripAnsi(output).replace(/\s+$/gm, ''));
        proc.kill();
      }
    });
  });
}
