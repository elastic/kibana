import { spawn } from 'child_process';
import path from 'path';
import { debounce } from 'lodash';
import stripAnsi from 'strip-ansi';

const TIMEOUT_IN_SECONDS = 15;
jest.setTimeout(TIMEOUT_IN_SECONDS * 1000);

export function runBackportViaCli(
  cliArgs: string[],
  {
    showOra,
    waitForString,
    cwd,
  }: {
    showOra?: boolean;
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

  return new Promise<string>((resolve, reject) => {
    let data = '';

    const timeoutSeconds = 2;
    const rejectOnTimeout = debounce(
      () => {
        reject(
          `Expectation '${waitForString}' not found within ${timeoutSeconds} second in:\n\n${data.toString()}`
        );
      },
      timeoutSeconds * 1000,
      { maxWait: 15000 }
    );

    // fail if expectations hasn't been found within 10 seconds

    const onChunk = (chunk: any) => {
      data += chunk;
      const stringfiedData = data.toString();
      rejectOnTimeout();

      // remove ansi codes and whitespace
      const output = stripAnsi(stringfiedData).replace(/\s+$/gm, '');

      if (!waitForString || output.includes(waitForString)) {
        rejectOnTimeout.cancel();
        resolve(output);
      }
    };

    proc.stdout.on('data', onChunk);

    // ora (loading spinner) is redirected to stderr
    if (showOra) {
      proc.stderr.on('data', onChunk);
    }

    proc.on('error', (err) => {
      reject(`runBackportViaCli failed with: ${err}`);
    });
  }).finally(() => {
    proc.kill();
  });
}
