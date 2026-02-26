/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/dev-cli-runner', () => ({
  run: jest.fn(),
}));

jest.mock('@kbn/dev-cli-errors', () => ({
  createFailError: (message: string) => new Error(message),
}));

jest.mock('@kbn/dev-validation-runner', () => ({
  readValidationRunFlags: jest.fn(),
  resolveValidationBaseContext: jest.fn(),
  VALIDATION_RUN_HELP: '',
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
    setWriters: jest.fn(),
  })),
}));

jest.mock('@kbn/repo-packages', () => ({
  getPackages: () => [{ directory: '/repo/packages/foo' }, { directory: '/repo/packages/bar' }],
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: (p: string) => p.endsWith('jest.config.js'),
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
const mockExeca = mockExecaFn;

let handler: (args: {
  flagsReader: {
    boolean: (name: string) => boolean;
  };
}) => Promise<void>;

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

describe('run_check_changes', () => {
  let stdoutSpy: jest.SpyInstance;

  beforeAll(() => {
    require('./run_check_changes');
    handler = mockRun.mock.calls[0][0];
  });

  beforeEach(() => {
    jest.clearAllMocks();
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockReturnValue(true);
    mockReadValidationRunFlags.mockReturnValue({});
    mockResolveValidationBaseContext.mockResolvedValue(baseContext);
    mockExecuteEslintValidation.mockResolvedValue({ fileCount: 3, fixedFiles: [] });
    mockExecuteTypeCheckValidation.mockResolvedValue({ projectCount: 2 });

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
    stdoutSpy.mockRestore();
  });

  it('prints compact output for successful checks', async () => {
    await handler({ flagsReader: { boolean: () => false } });

    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('check_changes  scope=local');
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

    await handler({ flagsReader: { boolean: () => false } });

    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('lint  — no files changed');
    expect(output).toContain('jest  — no changed files');
    expect(output).toContain('tsc   — no affected projects');
  });

  it('continues running checks and reports all failures', async () => {
    mockExecuteEslintValidation.mockRejectedValue(new Error('lint error'));
    mockExecuteTypeCheckValidation.mockRejectedValue(new Error('tsc error'));

    await handler({ flagsReader: { boolean: () => false } });

    expect(process.exitCode).toBe(1);
    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('lint  ✗ failed');
    expect(output).toContain('jest  ✓ 1 config ran, 5 tests');
    expect(output).toContain('tsc   ✗ failed');
  });

  it('shows fixed file count when eslint auto-fixes', async () => {
    mockExecuteEslintValidation.mockResolvedValue({
      fileCount: 10,
      fixedFiles: ['a.ts', 'b.ts'],
    });

    await handler({ flagsReader: { boolean: () => false } });

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

    await handler({ flagsReader: { boolean: () => false } });

    const output = stdoutSpy.mock.calls.map(([text]: [string]) => text).join('');
    expect(output).toContain('jest  ✓ 2 test files · 8 tests');
  });
});
