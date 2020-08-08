import { execSync, spawn } from 'child_process';
import stripAnsi from 'strip-ansi';
import { getDevAccessToken } from './private/getDevAccessToken';

const execOptions = { stdio: 'pipe', encoding: 'utf-8' } as const;

describe('yargs', () => {
  let devAccessToken: string;

  beforeAll(async () => {
    devAccessToken = await getDevAccessToken();
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
      `--upstream foo --username sqren --accessToken ${devAccessToken}`
    );
    expect(res).toMatchInlineSnapshot(`
      "You must specify a target branch

      You can specify it via either:
       - Config file (recommended): \\".backportrc.json\\". Read more: https://github.com/sqren/backport/blob/e119d71d6dc03cd061f6ad9b9a8b1cd995f98961/docs/configuration.md#project-config-backportrcjson
       - CLI: \\"--branch 6.1\\"
      "
    `);
  });

  it('should return error when upstream is missing', () => {
    const res = runBackport(
      `--branch foo --username sqren --accessToken ${devAccessToken}`
    );
    expect(res).toMatchInlineSnapshot(`
      "You must specify a valid Github repository

      You can specify it via either:
       - Config file (recommended): \\".backportrc.json\\". Read more: https://github.com/sqren/backport/blob/e119d71d6dc03cd061f6ad9b9a8b1cd995f98961/docs/configuration.md#project-config-backportrcjson
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
      `--branch foo --upstream foo/bar --username sqren --accessToken ${devAccessToken}`
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
      'sqren',
      '--accessToken',
      devAccessToken,
      '--author',
      'sqren',
      '--max-number',
      '6',
    ]);

    expect(output).toMatchInlineSnapshot(`
      "? Select commit (Use arrow keys)
      ❯ 1. Add branch label mapping (#225)
        2. Create \\"conflicting-file.txt\\" in master (f8bb8b70)
        3. Update romeo-and-juliet.txt (91eee967)
        4. Add 👻 (2e63475c)
        5. Add witch (#85)
        6. Add SF mention (#80) 6.3"
    `);
  });

  it(`should list commits from 7.x`, async () => {
    const output = await runBackportAsync([
      '--branch',
      'foo',
      '--upstream',
      'sqren/backport-demo',
      '--username',
      'sqren',
      '--accessToken',
      devAccessToken,
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
        6. Add SF mention (#80) 6.3"
    `);
  });
});

function runBackport(args: string) {
  const cmd = `./node_modules/.bin/ts-node --transpile-only ./src/entrypoint.cli.ts ${args}`;
  return execSync(cmd, execOptions);
}

function runBackportAsync(options: string[]) {
  const proc = spawn('./node_modules/.bin/ts-node', [
    '--transpile-only',
    './src/entrypoint.cli.ts',
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
