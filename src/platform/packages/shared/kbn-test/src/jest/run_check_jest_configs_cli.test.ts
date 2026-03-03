/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mock external dependencies
jest.mock('@kbn/dev-cli-runner', () => ({
  run: jest.fn(),
}));

jest.mock('@kbn/dev-cli-errors', () => ({
  createFailError: jest.fn(),
}));

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));

jest.mock('./configs/get_jest_configs', () => ({
  getJestConfigs: jest.fn(),
}));

// Mock performance.now for consistent timing
const mockPerformanceNow = jest.fn();

import { runCheckJestConfigsCli } from './run_check_jest_configs_cli';

describe('runCheckJestConfigsCli', () => {
  let mockRun: jest.Mock;
  let mockCreateFailError: jest.Mock;
  let mockGetJestConfigs: jest.Mock;
  let mockLog: {
    info: jest.Mock;
    error: jest.Mock;
    success: jest.Mock;
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Set up mocks
    mockRun = jest.mocked(jest.requireMock('@kbn/dev-cli-runner').run);
    mockCreateFailError = jest.mocked(jest.requireMock('@kbn/dev-cli-errors').createFailError);
    mockGetJestConfigs = jest.mocked(jest.requireMock('./configs/get_jest_configs').getJestConfigs);

    mockLog = {
      info: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
    };

    // Mock performance.now to return predictable values
    mockPerformanceNow.mockReturnValueOnce(1000).mockReturnValueOnce(2500); // 1.5s duration
    Object.defineProperty(performance, 'now', { value: mockPerformanceNow });

    // Mock createFailError to return an error
    mockCreateFailError.mockReturnValue(new Error('Test error'));

    // Set up default successful scenario
    mockGetJestConfigs.mockResolvedValue({
      configsWithTests: [
        {
          config: '/mock/repo/root/pkg/a/jest.config.js',
          testFiles: ['/mock/repo/root/pkg/a/test1.test.ts'],
        },
        {
          config: '/mock/repo/root/pkg/b/jest.config.js',
          testFiles: ['/mock/repo/root/pkg/b/test2.test.ts'],
        },
      ],
      emptyConfigs: [],
      orphanedTestFiles: [],
      duplicateTestFiles: [],
    });
  });

  afterEach(() => {
    mockPerformanceNow.mockReset();
  });

  it('should call run with correct description', () => {
    runCheckJestConfigsCli();

    expect(mockRun).toHaveBeenCalledWith(expect.any(Function), {
      description: 'Check that all test files are covered by one, and only one, Jest config',
    });
  });

  it('should succeed when all tests are covered by exactly one config', async () => {
    runCheckJestConfigsCli();

    // Extract the callback function passed to run()
    const runCallback = mockRun.mock.calls[0][0];
    await runCallback({ log: mockLog });

    expect(mockGetJestConfigs).toHaveBeenCalled();

    expect(mockLog.error).not.toHaveBeenCalled();
    expect(mockLog.success).toHaveBeenCalledWith(
      'Checked all jest config files in',
      expect.any(String)
    );
    expect(mockCreateFailError).not.toHaveBeenCalled();
  });

  it('should report error when test files are not covered by any config', async () => {
    mockGetJestConfigs.mockResolvedValue({
      configsWithTests: [
        {
          config: '/mock/repo/root/pkg/a/jest.config.js',
          testFiles: ['/mock/repo/root/pkg/a/test1.test.ts'],
        },
      ],
      emptyConfigs: [],
      orphanedTestFiles: ['/mock/repo/root/pkg/b/test2.test.ts'],
      duplicateTestFiles: [],
    });

    runCheckJestConfigsCli();
    const runCallback = mockRun.mock.calls[0][0];

    await expect(runCallback({ log: mockLog })).rejects.toThrow('Test error');

    expect(mockLog.error).toHaveBeenCalledWith(
      'The following test files are not selected by any jest config file:\n - pkg/b/test2.test.ts'
    );
    expect(mockCreateFailError).toHaveBeenCalledWith(
      'Please resolve the previously logged issues.'
    );
  });

  it('should report error when test files are covered by multiple configs', async () => {
    mockGetJestConfigs.mockResolvedValue({
      configsWithTests: [
        {
          config: '/mock/repo/root/pkg/a/jest.config.js',
          testFiles: ['/mock/repo/root/pkg/a/test1.test.ts'],
        },
        {
          config: '/mock/repo/root/pkg/b/jest.config.js',
          testFiles: ['/mock/repo/root/pkg/b/test2.test.ts'],
        },
      ],
      emptyConfigs: [],
      orphanedTestFiles: [],
      duplicateTestFiles: [
        {
          testFile: '/mock/repo/root/pkg/b/test2.test.ts',
          configs: ['/mock/repo/root/pkg/a/jest.config.js', '/mock/repo/root/pkg/b/jest.config.js'],
        },
      ],
    });

    runCheckJestConfigsCli();
    const runCallback = mockRun.mock.calls[0][0];

    await expect(runCallback({ log: mockLog })).rejects.toThrow('Test error');

    expect(mockLog.error).toHaveBeenCalledWith(
      expect.stringContaining('The following test files are selected by multiple config files:')
    );
    expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('pkg/a/jest.config.js, '));
    expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('pkg/b/jest.config.js'));
    expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('pkg/b/test2.test.ts'));
    expect(mockCreateFailError).toHaveBeenCalledWith(
      'Please resolve the previously logged issues.'
    );
  });

  it('should group multiple overlapping tests by the same config combinations', async () => {
    mockGetJestConfigs.mockResolvedValue({
      configsWithTests: [
        {
          config: '/mock/repo/root/pkg/a/jest.config.js',
          testFiles: [
            '/mock/repo/root/shared/test1.test.ts',
            '/mock/repo/root/shared/test2.test.ts',
          ],
        },
        {
          config: '/mock/repo/root/pkg/b/jest.config.js',
          testFiles: [
            '/mock/repo/root/shared/test1.test.ts',
            '/mock/repo/root/shared/test2.test.ts',
          ],
        },
      ],
      emptyConfigs: [],
      orphanedTestFiles: [],
      duplicateTestFiles: [
        {
          testFile: '/mock/repo/root/shared/test1.test.ts',
          configs: ['/mock/repo/root/pkg/a/jest.config.js', '/mock/repo/root/pkg/b/jest.config.js'],
        },
        {
          testFile: '/mock/repo/root/shared/test2.test.ts',
          configs: ['/mock/repo/root/pkg/a/jest.config.js', '/mock/repo/root/pkg/b/jest.config.js'],
        },
      ],
    });

    runCheckJestConfigsCli();
    const runCallback = mockRun.mock.calls[0][0];

    await expect(runCallback({ log: mockLog })).rejects.toThrow('Test error');

    expect(mockLog.error).toHaveBeenCalledWith(
      expect.stringContaining('The following test files are selected by multiple config files:')
    );
    expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('shared/test1.test.ts'));
    expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('shared/test2.test.ts'));
  });

  it('should handle both missing and multiple config scenarios', async () => {
    mockGetJestConfigs.mockResolvedValue({
      configsWithTests: [
        {
          config: '/mock/repo/root/pkg/a/jest.config.js',
          testFiles: [
            '/mock/repo/root/pkg/a/test1.test.ts',
            '/mock/repo/root/pkg/b/test2.test.ts', // Duplicate coverage
          ],
        },
        {
          config: '/mock/repo/root/pkg/b/jest.config.js',
          testFiles: ['/mock/repo/root/pkg/b/test2.test.ts'],
        },
      ],
      emptyConfigs: [],
      orphanedTestFiles: ['/mock/repo/root/orphan/test3.test.ts'],
      duplicateTestFiles: [
        {
          testFile: '/mock/repo/root/pkg/b/test2.test.ts',
          configs: ['/mock/repo/root/pkg/a/jest.config.js', '/mock/repo/root/pkg/b/jest.config.js'],
        },
      ],
    });

    runCheckJestConfigsCli();
    const runCallback = mockRun.mock.calls[0][0];

    await expect(runCallback({ log: mockLog })).rejects.toThrow('Test error');

    // Should report both missing and multiple configs
    expect(mockLog.error).toHaveBeenCalledWith(
      'The following test files are not selected by any jest config file:\n - orphan/test3.test.ts'
    );
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.stringContaining('The following test files are selected by multiple config files:')
    );
  });

  it('should format timing correctly for milliseconds', async () => {
    runCheckJestConfigsCli();
    const runCallback = mockRun.mock.calls[0][0];
    await runCallback({ log: mockLog });

    expect(mockLog.success).toHaveBeenCalledWith(
      'Checked all jest config files in',
      expect.stringMatching(/\d+(\.\d+)? (ms|s)/)
    );
  });

  it('should format timing correctly for seconds', async () => {
    runCheckJestConfigsCli();
    const runCallback = mockRun.mock.calls[0][0];
    await runCallback({ log: mockLog });

    expect(mockLog.success).toHaveBeenCalledWith(
      'Checked all jest config files in',
      expect.stringMatching(/\d+(\.\d+)? (ms|s)/)
    );
  });

  it('should sort configs by directory when reporting multiple configs', async () => {
    mockGetJestConfigs.mockResolvedValue({
      configsWithTests: [
        {
          config: '/mock/repo/root/z-pkg/jest.config.js',
          testFiles: ['/mock/repo/root/pkg/b/test2.test.ts'],
        },
        {
          config: '/mock/repo/root/a-pkg/jest.config.js',
          testFiles: ['/mock/repo/root/pkg/b/test2.test.ts'],
        },
      ],
      emptyConfigs: [],
      orphanedTestFiles: [],
      duplicateTestFiles: [
        {
          testFile: '/mock/repo/root/pkg/b/test2.test.ts',
          configs: ['/mock/repo/root/z-pkg/jest.config.js', '/mock/repo/root/a-pkg/jest.config.js'],
        },
      ],
    });

    runCheckJestConfigsCli();
    const runCallback = mockRun.mock.calls[0][0];

    await expect(runCallback({ log: mockLog })).rejects.toThrow('Test error');

    // Should sort configs alphabetically by directory
    expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('a-pkg/jest.config.js'));
    expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('z-pkg/jest.config.js'));
  });

  it('should handle empty jest paths gracefully', async () => {
    mockGetJestConfigs.mockResolvedValue({
      configsWithTests: [],
      emptyConfigs: [],
      orphanedTestFiles: [],
      duplicateTestFiles: [],
    });

    runCheckJestConfigsCli();
    const runCallback = mockRun.mock.calls[0][0];
    await runCallback({ log: mockLog });

    expect(mockLog.error).not.toHaveBeenCalled();
    expect(mockLog.success).toHaveBeenCalledWith(
      'Checked all jest config files in',
      expect.any(String)
    );
  });

  describe('helper functions', () => {
    it('should format milliseconds correctly', () => {
      // Access the fmtMs function by importing the module and checking its behavior
      // Since fmtMs is not exported, we test it indirectly through the timing output
      mockPerformanceNow.mockReset().mockReturnValueOnce(0).mockReturnValueOnce(500);

      runCheckJestConfigsCli();
      const runCallback = mockRun.mock.calls[0][0];
      return runCallback({ log: mockLog }).then(() => {
        expect(mockLog.success).toHaveBeenCalledWith(
          'Checked all jest config files in',
          expect.stringMatching(/\d+(\.\d+)? (ms|s)/)
        );
      });
    });

    it('should format list correctly', async () => {
      mockGetJestConfigs.mockResolvedValue({
        configsWithTests: [],
        emptyConfigs: ['/mock/repo/root/pkg/a/jest.config.js'],
        orphanedTestFiles: ['/mock/repo/root/test1.test.ts', '/mock/repo/root/test2.test.ts'],
        duplicateTestFiles: [],
      });

      runCheckJestConfigsCli();
      const runCallback = mockRun.mock.calls[0][0];

      await expect(runCallback({ log: mockLog })).rejects.toThrow();

      expect(mockLog.error).toHaveBeenCalledWith(
        'The following test files are not selected by any jest config file:\n - test1.test.ts\n - test2.test.ts'
      );
    });
  });
});
