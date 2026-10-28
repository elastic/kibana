/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';

import { ToolingLog } from '@kbn/tooling-log';
import { File } from '../file';
import { lintFiles } from './lint_files';

jest.mock('execa', () => jest.fn());
jest.mock('./constants', () => ({
  LINT_LOG_PREFIX: '[oxlint]',
  OXLINT_CONFIG_PATH: 'oxlint.config.mjs',
  OXLINT_FIX_CONFIG_PATH: 'oxlint.fix.config.mjs',
  oxlintBinPath: '/bin/oxlint',
}));
jest.mock('fs/promises', () => ({ ...jest.requireActual('fs/promises'), readFile: jest.fn() }));

const mockExeca = jest.requireMock('execa') as jest.Mock;
const mockReadFile = jest.requireMock('fs/promises').readFile as jest.Mock;

interface FakeRun {
  exitCode: number;
  diagnostics?: Array<{
    filename: string;
    severity: 'error' | 'warning';
    message?: string;
    code?: string;
    labels?: Array<{ span: { line: number; column: number } }>;
  }>;
  numberOfFiles?: number;
  stdoutPrefix?: string;
  stdout?: string;
  stderr?: string;
}

const respondWith = (...runs: FakeRun[]) => {
  for (const run of runs) {
    const stdout =
      run.stdout ??
      `${run.stdoutPrefix ?? ''}${JSON.stringify({
        diagnostics: (run.diagnostics ?? []).map((d) => ({ message: '', code: '', ...d })),
        number_of_files: run.numberOfFiles ?? 1,
      })}`;
    mockExeca.mockResolvedValueOnce({ stdout, stderr: run.stderr ?? '', exitCode: run.exitCode });
  }
};

const passedArgs = (call: number): string[] => mockExeca.mock.calls[call][1];

describe('oxlint lintFiles', () => {
  const log = new ToolingLog();
  const files = [new File('src/a.ts'), new File('src/b.ts')];

  beforeEach(() => {
    mockExeca.mockReset();
    mockReadFile.mockReset();
  });

  it('passes explicit relative paths and no --fix by default', async () => {
    respondWith({ exitCode: 0, numberOfFiles: 2 });

    const result = await lintFiles(log, files);

    expect(mockExeca).toHaveBeenCalledTimes(1);
    expect(passedArgs(0)).toEqual([
      '/bin/oxlint',
      '--config',
      'oxlint.config.mjs',
      '--format',
      'json',
      'src/a.ts',
      'src/b.ts',
    ]);
    expect(result).toEqual({ failedFiles: [], lintedFileCount: 2, warningCount: 0 });
  });

  it('passes repository-relative paths when files are created from a subdirectory', async () => {
    respondWith({ exitCode: 0 });

    const cwd = process.cwd();
    try {
      process.chdir(`${REPO_ROOT}/src`);
      const file = new File('dev/file.ts');

      await lintFiles(log, [file]);
    } finally {
      process.chdir(cwd);
    }

    expect(passedArgs(0)).toEqual([
      '/bin/oxlint',
      '--config',
      'oxlint.config.mjs',
      '--format',
      'json',
      'src/dev/file.ts',
    ]);
  });

  it('reports failed files once, sorted, and counts warnings', async () => {
    respondWith({
      exitCode: 1,
      numberOfFiles: 2,
      diagnostics: [
        { filename: 'src/b.ts', severity: 'error' },
        { filename: 'src/a.ts', severity: 'error' },
        { filename: 'src/b.ts', severity: 'error' },
        { filename: 'src/a.ts', severity: 'warning' },
      ],
    });

    const result = await lintFiles(log, files);

    expect(result).toEqual({
      failedFiles: ['src/a.ts', 'src/b.ts'],
      lintedFileCount: 2,
      warningCount: 1,
    });
  });

  it('treats an all-ignored file set as an empty result despite the stdout preamble and exit 1', async () => {
    respondWith({
      exitCode: 1,
      numberOfFiles: 0,
      stdoutPrefix: 'No files found to lint. Please check your paths and ignore patterns.\n',
    });

    const result = await lintFiles(log, [new File('src/types.d.ts')]);

    expect(result).toEqual({ failedFiles: [], lintedFileCount: 0, warningCount: 0 });
  });

  it('throws a fail error when oxlint exits nonzero without error diagnostics', async () => {
    respondWith({ exitCode: 2, numberOfFiles: 0, stderr: 'Failed to parse configuration' });

    await expect(lintFiles(log, files)).rejects.toThrow(
      '[oxlint] exited with 2:\nFailed to parse configuration'
    );
  });

  it('throws a fail error when stdout is not a JSON report', async () => {
    respondWith({ exitCode: 0, stdout: 'thread panicked' });

    await expect(lintFiles(log, files)).rejects.toThrow('[oxlint] exited with 0:\nthread panicked');
  });

  it('throws a fail error for tool-level diagnostics without a filename', async () => {
    mockExeca.mockResolvedValueOnce({
      exitCode: 1,
      stderr: '',
      stdout: JSON.stringify({
        number_of_files: 1,
        diagnostics: [
          {
            message: 'Failed to open file src/gone.ts with error "No such file or directory"',
            severity: 'error',
            labels: [],
          },
        ],
      }),
    });

    await expect(lintFiles(log, files)).rejects.toThrow(
      '[oxlint] exited with 1:\nFailed to open file src/gone.ts'
    );
  });

  it('batches explicit paths above the ARG_MAX guard', async () => {
    const many = Array.from({ length: 4001 }, (_, i) => new File(`src/f${i}.ts`));
    respondWith({ exitCode: 0, numberOfFiles: 4000 }, { exitCode: 0, numberOfFiles: 1 });

    const result = await lintFiles(log, many);

    expect(mockExeca).toHaveBeenCalledTimes(2);
    expect(passedArgs(0)).toHaveLength(5 + 4000);
    expect(passedArgs(1)).toEqual([
      '/bin/oxlint',
      '--config',
      'oxlint.config.mjs',
      '--format',
      'json',
      'src/f4000.ts',
    ]);
    expect(result.lintedFileCount).toBe(4001);
  });

  it('does not let lint errors in one batch mask a tool failure in another', async () => {
    const many = Array.from({ length: 4001 }, (_, i) => new File(`src/f${i}.ts`));
    respondWith(
      {
        exitCode: 1,
        numberOfFiles: 4000,
        diagnostics: [{ filename: 'src/f1.ts', severity: 'error' }],
      },
      { exitCode: 2, numberOfFiles: 0, stderr: 'parser crashed' }
    );

    await expect(lintFiles(log, many)).rejects.toThrow('[oxlint] exited with 2:\nparser crashed');
  });

  it('fixes only files with errors, with the errors-only config, until they stop changing', async () => {
    respondWith(
      // errors-only scan
      {
        exitCode: 1,
        numberOfFiles: 5000,
        diagnostics: [{ filename: 'src/a.ts', severity: 'error' }],
      },
      // two fix passes: the first changes the file, the second does not
      { exitCode: 0 },
      { exitCode: 0 },
      // report with the full config
      {
        exitCode: 0,
        numberOfFiles: 5000,
        diagnostics: [{ filename: 'src/b.ts', severity: 'warning' }],
      }
    );
    mockReadFile
      .mockResolvedValueOnce('no header')
      .mockResolvedValueOnce('header')
      .mockResolvedValueOnce('header')
      .mockResolvedValueOnce('header');

    const result = await lintFiles(log, files, { fix: true, fullRepo: true });

    const fixConfig = ['/bin/oxlint', '--config', 'oxlint.fix.config.mjs', '--format', 'json'];
    expect(mockExeca).toHaveBeenCalledTimes(4);
    expect(passedArgs(0)).toEqual(fixConfig);
    expect(passedArgs(1)).toEqual([...fixConfig, '--fix', 'src/a.ts']);
    expect(passedArgs(2)).toEqual([...fixConfig, '--fix', 'src/a.ts']);
    expect(passedArgs(3)).toEqual([
      '/bin/oxlint',
      '--config',
      'oxlint.config.mjs',
      '--format',
      'json',
    ]);
    expect(result).toEqual({ failedFiles: [], lintedFileCount: 5000, warningCount: 1 });
  });

  it('does not run --fix when no file has errors', async () => {
    respondWith({ exitCode: 0, numberOfFiles: 2 }, { exitCode: 0, numberOfFiles: 2 });

    await lintFiles(log, files, { fix: true });

    expect(mockExeca).toHaveBeenCalledTimes(2);
    expect(mockExeca.mock.calls.flatMap(([, args]) => args)).not.toContain('--fix');
  });
});
