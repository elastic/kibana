/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Os from 'os';

jest.mock('@kbn/dev-cli-runner', () => ({
  run: jest.fn(),
}));

jest.mock('@kbn/dev-cli-errors', () => ({
  createFailError: (message: string) => new Error(message),
}));

jest.mock('@kbn/dev-validation-runner', () => ({
  readValidationRunFlags: jest.fn(),
  resolveValidationBaseContext: jest.fn(),
  VALIDATION_RUN_HELP: [],
  VALIDATION_RUN_STRING_FLAGS: [],
}));

jest.mock('@kbn/moon', () => ({
  getMoonExecutablePath: jest.fn().mockResolvedValue('/mock/moon'),
}));

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/repo',
}));

jest.mock('./type_check_validation_loader', () => ({
  executeTypeCheckValidation: jest.fn(),
}));

jest.mock('./eslint/run_eslint_contract', () => ({
  executeEslintValidation: jest.fn(),
}));

jest.mock('@kbn/dev-proc-runner', () => ({
  ProcRunner: jest.fn().mockImplementation(() => ({
    teardown: jest.fn(),
  })),
}));

jest.mock('@kbn/tooling-log', () => ({
  ToolingLog: jest.fn().mockImplementation(() => ({
    writers: [] as Array<{ write: (msg: { args: unknown[]; type: string }) => boolean }>,
    setWriters: jest.fn(function (this: { writers: unknown[] }, writers: unknown[]) {
      this.writers = writers;
    }),
  })),
}));

jest.mock('@kbn/repo-packages', () => ({
  getPackages: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
}));

const mockExecaFn = jest.fn();
jest.mock('execa', () => ({ __esModule: true, default: mockExecaFn }));

const mockRun = jest.requireMock('@kbn/dev-cli-runner').run as jest.Mock;
const mockReadValidationRunFlags = jest.requireMock('@kbn/dev-validation-runner')
  .readValidationRunFlags as jest.Mock;
const mockResolveValidationBaseContext = jest.requireMock('@kbn/dev-validation-runner')
  .resolveValidationBaseContext as jest.Mock;
const mockExecuteTypeCheckValidation = jest.requireMock('./type_check_validation_loader')
  .executeTypeCheckValidation as jest.Mock;
const mockExecuteEslintValidation = jest.requireMock('./eslint/run_eslint_contract')
  .executeEslintValidation as jest.Mock;
const mockGetPackages = jest.requireMock('@kbn/repo-packages').getPackages as jest.Mock;
const mockExistsSync = jest.requireMock('fs').existsSync as jest.Mock;
const mockExeca = mockExecaFn;

let handler: (args: {
  flags: {
    fix: boolean;
  };
  flagsReader: {
    boolean: (name: string) => boolean;
  };
}) => Promise<void>;

const createArgs = (overrides: { fix?: boolean; verbose?: boolean } = {}) => ({
  flags: {
    fix: overrides.fix ?? true,
  },
  flagsReader: {
    boolean: (name: string) => {
      if (name === 'fix') {
        return overrides.fix ?? true;
      }

      return name === 'verbose' ? overrides.verbose ?? false : false;
    },
  },
});

const baseContext = {
  mode: 'contract' as const,
  contract: {
    profile: 'quick',
    scope: 'local',
    testMode: 'related',
    downstream: 'none',
  },
  runContext: {
    kind: 'affected' as const,
    contract: {
      profile: 'quick',
      scope: 'local',
      testMode: 'related',
      downstream: 'none',
    },
    resolvedBase: undefined,
    changedFiles: ['packages/foo/src/index.ts'],
  },
};

describe('run_check', () => {
  let stdoutSpy: jest.SpyInstance;
  let cpusSpy: jest.SpyInstance;
  let previousExitCode: typeof process.exitCode;

  beforeAll(() => {
    require('./run_check');
    handler = mockRun.mock.calls[0][0];
  });

  beforeEach(() => {
    jest.clearAllMocks();
    previousExitCode = process.exitCode;
    process.exitCode = undefined;
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
    cpusSpy = jest.spyOn(Os, 'cpus').mockReturnValue(new Array(8).fill({}) as any);
    mockReadValidationRunFlags.mockReturnValue({});
    mockResolveValidationBaseContext.mockResolvedValue(baseContext);
    mockExistsSync.mockImplementation(
      (p: string) =>
        p === '/repo/packages/foo/jest.config.js' || p === '/repo/packages/bar/jest.config.js'
    );
    mockExecuteEslintValidation.mockResolvedValue({
      fileCount: 3,
      fixedFiles: [],
      failedFiles: [],
      warningCount: 0,
    });
    mockExecuteTypeCheckValidation.mockResolvedValue({ projectCount: 2 });
    mockGetPackages.mockReturnValue([
      { directory: '/repo/packages/foo' },
      { directory: '/repo/packages/bar' },
    ]);

    // Mock Moon jest run (success, 1 config ran, 5 tests via --json)
    mockExeca.mockResolvedValue({
      exitCode: 0,
      stdout: [
        'pass RunTask(@kbn/foo:jest) (1s 200ms, abc123)',
        '@kbn/foo:jest | {"success":true,"numTotalTests":5,"numPassedTests":5,"numFailedTests":0,"testResults":[]}',
      ].join('\n'),
      stderr: '',
    });
  });

  afterEach(() => {
    process.exitCode = previousExitCode;
    cpusSpy.mockRestore();
    stdoutSpy.mockRestore();
  });

  it('prints compact output for successful checks', async () => {
    await handler(createArgs());

    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('check  scope=local');
    expect(output).toContain('lint  ✓ 3 files');
    expect(output).toContain('jest  ✓ 1 config ran, 5 tests');
    expect(output).toContain('tsc   ✓ 2 projects');
  });

  it('prints skip lines when validators return null and no changed files', async () => {
    mockExecuteEslintValidation.mockResolvedValue(null);
    mockExecuteTypeCheckValidation.mockResolvedValue(null);
    mockResolveValidationBaseContext.mockResolvedValue({
      ...baseContext,
      runContext: {
        ...baseContext.runContext,
        changedFiles: [],
      },
    });

    await handler(createArgs());

    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('lint  — no files changed');
    expect(output).toContain('jest  — no changed files');
    expect(output).toContain('tsc   — no affected projects');
  });

  it('prints validation warnings before check results', async () => {
    mockResolveValidationBaseContext.mockImplementation(async ({ onWarning }) => {
      onWarning?.('affected file detection is unavailable in a shallow repository');
      onWarning?.('run `git fetch --unshallow`');
      return {
        ...baseContext,
        runContext: {
          ...baseContext.runContext,
          changedFiles: [],
        },
      };
    });
    mockExecuteEslintValidation.mockResolvedValue(null);
    mockExecuteTypeCheckValidation.mockResolvedValue(null);

    await handler(createArgs());

    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain(
      'warn  ! affected file detection is unavailable in a shallow repository'
    );
    expect(output).toContain('warn  ! run `git fetch --unshallow`');
    expect(output).toContain('jest  — no changed files');
  });

  it('continues running checks and reports all failures', async () => {
    mockExecuteEslintValidation.mockResolvedValue({
      fileCount: 3,
      fixedFiles: [],
      failedFiles: ['src/foo.ts'],
      warningCount: 0,
    });
    mockExecuteTypeCheckValidation.mockRejectedValue(new Error('tsc error'));

    await handler(createArgs());

    expect(process.exitCode).toBe(1);
    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('lint  ✗ failed');
    expect(output).toContain('node scripts/eslint src/foo.ts');
    expect(output).toContain('jest  ✓ 1 config ran, 5 tests');
    expect(output).toContain('tsc   ✗ failed');
  });

  it('shows fixed file count when eslint auto-fixes', async () => {
    mockExecuteEslintValidation.mockResolvedValue({
      fileCount: 10,
      fixedFiles: ['a.ts', 'b.ts'],
      failedFiles: [],
      warningCount: 0,
    });

    await handler(createArgs());

    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('lint  ✓ 10 files (fixed 2 files)');
  });

  it('uses test-only fast path when all changed files are test files', async () => {
    mockResolveValidationBaseContext.mockResolvedValue({
      ...baseContext,
      runContext: {
        ...baseContext.runContext,
        changedFiles: ['packages/foo/src/bar.test.ts', 'packages/foo/src/baz.test.ts'],
      },
    });

    mockExeca.mockResolvedValue({
      exitCode: 0,
      stdout: 'Tests:       8 passed, 8 total\n',
      stderr: '',
    });

    await handler(createArgs());

    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('jest  ✓ 2 test files · 8 tests');
  });

  it('shows failing fast-path Jest output and a minimal rerun command', async () => {
    mockResolveValidationBaseContext.mockResolvedValue({
      ...baseContext,
      runContext: {
        ...baseContext.runContext,
        changedFiles: ['packages/foo/src/bar.test.ts'],
      },
    });

    mockExeca.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: [
        'FAIL packages/foo/src/bar.test.ts',
        '  Example failure',
        'Tests:       1 failed, 1 total',
      ].join('\n'),
    });

    await handler(createArgs());

    expect(process.exitCode).toBe(1);
    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('jest  ✗ failed');
    expect(output).toContain('FAIL packages/foo/src/bar.test.ts');
    expect(output).toContain('node scripts/jest packages/foo/src/bar.test.ts');
  });

  it('still invokes Moon for downstream Jest tasks when the changed package has no local config', async () => {
    mockGetPackages.mockReturnValue([
      { directory: '/repo/packages/baz' },
      { directory: '/repo/packages/foo' },
    ]);
    mockResolveValidationBaseContext.mockResolvedValue({
      ...baseContext,
      contract: {
        ...baseContext.contract,
        downstream: 'deep',
      },
      runContext: {
        ...baseContext.runContext,
        contract: {
          ...baseContext.runContext.contract,
          downstream: 'deep',
        },
        changedFiles: ['packages/baz/src/index.ts'],
      },
    });

    await handler(createArgs());

    expect(mockExeca).toHaveBeenCalledWith(
      '/mock/moon',
      expect.arrayContaining(['--affected', '--stdin', '--downstream', 'deep']),
      expect.any(Object)
    );

    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('jest  ✓ 1 config ran, 5 tests');
  });

  it('caps Moon concurrency at two for cache-heavy affected Jest runs', async () => {
    mockGetPackages.mockReturnValue([
      { directory: '/repo/packages/foo' },
      { directory: '/repo/packages/bar' },
      { directory: '/repo/packages/baz' },
      { directory: '/repo/packages/qux' },
    ]);
    mockResolveValidationBaseContext.mockResolvedValue({
      ...baseContext,
      runContext: {
        ...baseContext.runContext,
        changedFiles: [
          'packages/foo/src/index.ts',
          'packages/bar/src/index.ts',
          'packages/baz/src/index.ts',
          'packages/qux/src/index.ts',
        ],
      },
    });

    await handler(createArgs());

    expect(mockExeca).toHaveBeenCalledWith(
      '/mock/moon',
      expect.arrayContaining(['--concurrency', '2', '--maxWorkers=4']),
      expect.any(Object)
    );
  });

  it('reports Moon Jest startup failures instead of saying no affected configs', async () => {
    mockExeca.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: [
        '@kbn/foo:jest | Error: task_runner::run_failed',
        '@kbn/foo:jest | Broken startup before Jest JSON output',
        'Error: task_runner::run_failed',
      ].join('\n'),
    });

    await handler(createArgs());

    expect(process.exitCode).toBe(1);
    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('jest  ✗ failed');
    expect(output).toContain('Broken startup before Jest JSON output');
    expect(output).not.toContain('jest  — no affected configs');
  });

  it('uses the repo root Jest config when no package-level config is found', async () => {
    mockExistsSync.mockImplementation((p: string) => p === '/repo/jest.config.js');
    mockResolveValidationBaseContext.mockResolvedValue({
      ...baseContext,
      runContext: {
        ...baseContext.runContext,
        changedFiles: ['packages/foo/src/index.ts'],
      },
    });
    mockExeca.mockResolvedValue({
      exitCode: 0,
      stdout: [
        'fail RunTask(@kbn/foo:jest) (1s 200ms, abc123)',
        '@kbn/foo:jest | {"success":false,"numTotalTests":1,"numPassedTests":0,"numFailedTests":1,"testResults":[{"name":"/repo/packages/foo/src/bar.test.ts","assertionResults":[{"status":"failed","fullName":"fails","failureMessages":["Error\\n    at /repo/packages/foo/src/bar.test.ts:12:3"]}]}]}',
      ].join('\n'),
      stderr: '',
    });

    await handler(createArgs());

    expect(process.exitCode).toBe(1);
    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('node scripts/jest --config jest.config.js');
  });

  it('uses the repo root tsconfig in the tsc rerun command when no nearer config exists', async () => {
    mockExistsSync.mockImplementation(
      (p: string) => p === '/repo/packages/foo/jest.config.js' || p === '/repo/tsconfig.json'
    );
    mockExecuteTypeCheckValidation.mockImplementation(async ({ log }) => {
      log.writers[0].write({
        args: ['proc [tsc] src/dev/run_check.ts(852,13): error TS1234: broken'],
        type: 'error',
      });
      throw new Error('tsc error');
    });

    await handler(createArgs());

    expect(process.exitCode).toBe(1);
    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('src/dev/run_check.ts:852:13: error TS1234: broken');
    expect(output).toContain('node scripts/type_check --project tsconfig.json');
    expect(output).not.toContain('node scripts/type_check --profile quick');
  });
});
