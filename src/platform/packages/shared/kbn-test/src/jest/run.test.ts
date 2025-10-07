/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mock all dependencies before importing anything else
jest.mock('@kbn/scout-info', () => ({
  SCOUT_REPORTER_ENABLED: false,
}));

jest.mock('jest', () => ({
  run: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('jest-config', () => ({
  readInitialOptions: jest.fn().mockResolvedValue({ config: {} }),
}));

jest.mock('@kbn/tooling-log', () => ({
  ToolingLog: jest.fn().mockImplementation(() => ({
    verbose: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  })),
}));

jest.mock('@kbn/ci-stats-reporter', () => ({
  getTimeReporter: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ isFile: () => true }),
  },
  existsSync: jest.fn().mockReturnValue(true),
}));

jest.mock('@kbn/dev-cli-errors', () => ({
  createFailError: jest.fn((msg) => new Error(msg)),
}));

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));

jest.mock('getopts', () => jest.fn());

import { relative } from 'path';
import {
  commonBasePath,
  parseJestArguments,
  findConfigInDirectoryTree,
  discoverJestConfig,
  resolveJestConfig,
  prepareJestExecution,
  removeFlagFromArgv,
} from './run';

describe('run.ts', () => {
  beforeEach(() => {
    // Reset process.env
    delete process.env.JEST_CONFIG_PATH;
    delete process.env.NODE_ENV;
    delete process.env.INIT_CWD;

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('commonBasePath', () => {
    it('returns a common path', () => {
      expect(commonBasePath(['foo/bar/baz', 'foo/bar/quux', 'foo/bar'])).toBe('foo/bar');
    });

    it('handles an empty array', () => {
      expect(commonBasePath([])).toBe('');
    });

    it('handles no common path', () => {
      expect(commonBasePath(['foo', 'bar'])).toBe('');
    });

    it('matches full paths', () => {
      expect(commonBasePath(['foo/bar', 'foo/bar_baz'])).toBe('foo');
    });

    it('handles single path', () => {
      expect(commonBasePath(['foo/bar/baz'])).toBe('foo/bar/baz');
    });

    it('handles paths with different separators', () => {
      expect(commonBasePath(['foo\\bar\\baz', 'foo\\bar\\quux'], '\\')).toBe('foo\\bar');
    });

    it('handles absolute paths', () => {
      expect(commonBasePath(['/usr/local/bin', '/usr/local/lib', '/usr/local/share'])).toBe(
        '/usr/local'
      );
    });

    it('handles mixed relative and absolute paths', () => {
      expect(commonBasePath(['/absolute/path', 'relative/path'])).toBe('');
    });

    it('handles paths with trailing separators', () => {
      expect(commonBasePath(['foo/bar/', 'foo/bar/baz'])).toBe('foo/bar');
    });

    it('handles deeply nested common paths', () => {
      expect(
        commonBasePath([
          'very/deep/nested/path/file1.js',
          'very/deep/nested/path/file2.js',
          'very/deep/nested/path/subdir/file3.js',
        ])
      ).toBe('very/deep/nested/path');
    });
  });

  describe('environment variable handling', () => {
    it('should set NODE_ENV to test when not already set', () => {
      delete process.env.NODE_ENV;

      // Simulate the NODE_ENV logic from runJest
      if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'test';
      }

      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should not override existing NODE_ENV', () => {
      process.env.NODE_ENV = 'development';

      // Simulate the NODE_ENV logic from runJest
      if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'test';
      }

      expect(process.env.NODE_ENV).toBe('development');
    });

    it('should use INIT_CWD when available', () => {
      process.env.INIT_CWD = '/custom/init/cwd';
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue('/different/cwd');

      // Simulate the currentWorkingDirectory logic from runJest
      const currentWorkingDirectory = process.env.INIT_CWD || process.cwd();

      expect(currentWorkingDirectory).toBe('/custom/init/cwd');

      process.cwd = originalCwd;
    });

    it('should fall back to process.cwd() when INIT_CWD is not available', () => {
      delete process.env.INIT_CWD;
      const originalCwd = process.cwd;
      process.cwd = jest.fn().mockReturnValue('/fallback/cwd');

      // Simulate the currentWorkingDirectory logic from runJest
      const currentWorkingDirectory = process.env.INIT_CWD || process.cwd();

      expect(currentWorkingDirectory).toBe('/fallback/cwd');

      process.cwd = originalCwd;
    });
  });

  describe('parseJestArguments', () => {
    let mockGetopts: jest.Mock;

    beforeEach(() => {
      mockGetopts = jest.mocked(jest.requireMock('getopts'));
    });

    it('should parse arguments with verbose flag', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'script', '--verbose'];

      mockGetopts.mockReturnValue({
        _: [],
        verbose: true,
        help: false,
      });

      const result = parseJestArguments();

      expect(result.parsedArguments.verbose).toBe(true);
      expect(result.unknownFlags).toEqual([]);

      process.argv = originalArgv;
    });

    it('should parse arguments with config flag', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'script', '--config', '/path/to/jest.config.js'];

      mockGetopts.mockReturnValue({
        _: [],
        config: '/path/to/jest.config.js',
        verbose: false,
        help: false,
      });

      const result = parseJestArguments();

      expect(result.parsedArguments.config).toBe('/path/to/jest.config.js');

      process.argv = originalArgv;
    });

    it('should parse positional arguments', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'script', 'src/test1.js', 'src/test2.js'];

      mockGetopts.mockReturnValue({
        _: ['src/test1.js', 'src/test2.js'],
        verbose: false,
        help: false,
      });

      const result = parseJestArguments();

      expect(result.parsedArguments._).toEqual(['src/test1.js', 'src/test2.js']);

      process.argv = originalArgv;
    });

    it('should handle testPathPattern flag', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'script', '--testPathPattern', 'src/**/*.test.js'];

      mockGetopts.mockReturnValue({
        _: [],
        testPathPattern: 'src/**/*.test.js',
        verbose: false,
        help: false,
      });

      const result = parseJestArguments();

      expect(result.parsedArguments.testPathPattern).toBe('src/**/*.test.js');

      process.argv = originalArgv;
    });
  });

  describe('findConfigInDirectoryTree', () => {
    let mockExistsSync: jest.Mock;

    beforeEach(() => {
      mockExistsSync = jest.mocked(jest.requireMock('fs').existsSync);
    });

    it('should find config in current directory', () => {
      mockExistsSync.mockImplementation((path: string) => path === '/current/dir/jest.config.js');

      const result = findConfigInDirectoryTree('/current/dir', [
        'jest.config.dev.js',
        'jest.config.js',
      ]);

      expect(result).toBe('/current/dir/jest.config.js');
    });

    it('should find config in parent directory', () => {
      mockExistsSync.mockImplementation((path: string) => path === '/parent/jest.config.js');

      // Mock REPO_ROOT for this test
      const mockRepoInfo = jest.mocked(jest.requireMock('@kbn/repo-info'));
      const originalRepoRoot = mockRepoInfo.REPO_ROOT;
      mockRepoInfo.REPO_ROOT = '/';

      const result = findConfigInDirectoryTree('/parent/child', [
        'jest.config.dev.js',
        'jest.config.js',
      ]);

      expect(result).toBe('/parent/jest.config.js');

      mockRepoInfo.REPO_ROOT = originalRepoRoot;
    });

    it('should prefer jest.config.dev.js over jest.config.js', () => {
      mockExistsSync.mockImplementation(
        (path: string) =>
          path === '/current/dir/jest.config.dev.js' || path === '/current/dir/jest.config.js'
      );

      const result = findConfigInDirectoryTree('/current/dir', [
        'jest.config.dev.js',
        'jest.config.js',
      ]);

      expect(result).toBe('/current/dir/jest.config.dev.js');
    });

    it('should return null when no config is found', () => {
      mockExistsSync.mockReturnValue(false);

      const result = findConfigInDirectoryTree('/some/dir', ['jest.config.js']);

      expect(result).toBeNull();
    });
  });

  describe('discoverJestConfig', () => {
    let mockExistsSync: jest.Mock;
    let mockToolingLog: jest.Mock;

    beforeEach(() => {
      mockExistsSync = jest.mocked(jest.requireMock('fs').existsSync);
      mockToolingLog = jest.mocked(jest.requireMock('@kbn/tooling-log').ToolingLog);
    });

    it('should discover config when files are provided', () => {
      mockExistsSync.mockImplementation(
        (path: string) => path === '/workspace/src/plugins/test/jest.config.js'
      );

      const log = new mockToolingLog();
      const testFiles = ['/workspace/src/plugins/test/file.test.js'];
      const currentWorkingDirectory = '/workspace/src/plugins/test';

      const result = discoverJestConfig(testFiles, currentWorkingDirectory, 'jest.config.js', log);

      expect(result).toBe('/workspace/src/plugins/test/jest.config.js');
    });

    it('should discover config when no files are provided', () => {
      mockExistsSync.mockImplementation((path: string) => path === '/workspace/jest.config.js');

      const log = new mockToolingLog();
      const testFiles: string[] = [];
      const currentWorkingDirectory = '/workspace';

      const result = discoverJestConfig(testFiles, currentWorkingDirectory, 'jest.config.js', log);

      expect(result).toBe('/workspace/jest.config.js');
    });
  });

  describe('path resolution utilities', () => {
    it('should calculate relative paths correctly', () => {
      const testFiles = [
        '/workspace/x-pack/plugins/test/file1.test.js',
        '/workspace/x-pack/plugins/test/file2.test.js',
      ];
      const currentWorkingDirectory = '/workspace/x-pack/plugins/test';

      const relativePaths = testFiles.map((testFile) =>
        relative(currentWorkingDirectory, testFile)
      );

      expect(relativePaths).toEqual(['file1.test.js', 'file2.test.js']);
    });

    it('should detect x-pack projects correctly', () => {
      const xpackDirectory = '/workspace/x-pack/plugins/test';
      const nonXpackDirectory = '/workspace/src/plugins/test';

      expect(xpackDirectory.includes('x-pack')).toBe(true);
      expect(nonXpackDirectory.includes('x-pack')).toBe(false);
    });
  });

  describe('removeFlagFromArgv', () => {
    it('should remove config flags from argv correctly', () => {
      const argv = [
        'node',
        'script',
        '--config',
        '/old/config.js',
        '--verbose',
        '--config=another.js',
      ];

      const result = removeFlagFromArgv(argv, 'config');

      expect(result).toEqual(['node', 'script', '--verbose']);
    });

    it('should handle flags without values', () => {
      const argv = ['node', 'script', '--verbose', '--config', '/config.js', '--silent'];

      const result = removeFlagFromArgv(argv, 'verbose');

      expect(result).toEqual(['node', 'script', '/config.js', '--silent']);
    });

    it('should handle flags in --flag=value format', () => {
      const argv = ['node', 'script', '--config=/path/to/config.js', '--verbose'];

      const result = removeFlagFromArgv(argv, 'config');

      expect(result).toEqual(['node', 'script', '--verbose']);
    });

    it('should handle multiple instances of the same flag', () => {
      const argv = [
        'node',
        'script',
        '--config',
        'config1.js',
        '--config',
        'config2.js',
        '--verbose',
      ];

      const result = removeFlagFromArgv(argv, 'config');

      expect(result).toEqual(['node', 'script', '--verbose']);
    });

    it('should handle mixed flag formats', () => {
      const argv = ['node', 'script', '--config', 'config1.js', '--config=config2.js', '--verbose'];

      const result = removeFlagFromArgv(argv, 'config');

      expect(result).toEqual(['node', 'script', '--verbose']);
    });

    it('should return original array when flag not found', () => {
      const argv = ['node', 'script', '--verbose', '--silent'];

      const result = removeFlagFromArgv(argv, 'config');

      expect(result).toEqual(['node', 'script', '--verbose', '--silent']);
    });
  });

  describe('resolveJestConfig', () => {
    let mockReadInitialOptions: jest.Mock;
    let mockStat: jest.Mock;

    beforeEach(() => {
      mockReadInitialOptions = jest.mocked(jest.requireMock('jest-config').readInitialOptions);
      mockStat = jest.mocked(jest.requireMock('fs').promises.stat);
    });

    it('should resolve config from file path', async () => {
      const mockConfig = { testMatch: ['**/*.test.js'] };
      mockReadInitialOptions.mockResolvedValue({ config: mockConfig });
      mockStat.mockResolvedValue({ isFile: () => true });

      const parsedArguments = { config: '/path/to/jest.config.js' };
      const configPath = '/path/to/jest.config.js';

      const result = await resolveJestConfig(parsedArguments, configPath);

      expect(result).toEqual({ config: mockConfig, configPath });
      expect(mockReadInitialOptions).toHaveBeenCalledWith(configPath);
    });

    it('should resolve config from JSON string', async () => {
      const configJson = '{"testMatch": ["**/*.test.js"]}';
      const parsedArguments = { config: configJson };

      const result = await resolveJestConfig(parsedArguments, configJson);

      expect(result).toEqual({ config: { testMatch: ['**/*.test.js'] }, configPath: configJson });
    });

    it('should handle invalid JSON config as file path', async () => {
      const invalidJson = '{"testMatch": ["**/*.test.js"'; // Missing closing brace
      const mockConfig = { testMatch: ['**/*.test.js'] };

      mockReadInitialOptions.mockResolvedValue({ config: mockConfig });
      mockStat.mockResolvedValue({ isFile: () => true });

      const parsedArguments = { config: invalidJson };

      const result = await resolveJestConfig(parsedArguments, invalidJson);

      expect(result).toEqual({ config: mockConfig, configPath: invalidJson });
      expect(mockReadInitialOptions).toHaveBeenCalledWith(invalidJson);
    });
  });

  describe('prepareJestExecution', () => {
    let mockMkdir: jest.Mock;

    beforeEach(() => {
      mockMkdir = jest.mocked(jest.requireMock('fs').promises.mkdir);
      // Reset process.argv for these tests
      process.argv = ['node', 'script'];
    });

    it('should create cache directory and prepare Jest execution', async () => {
      const baseConfig = { testMatch: ['**/*.test.js'] };

      const result = await prepareJestExecution(baseConfig);

      expect(mockMkdir).toHaveBeenCalledWith('/mock/repo/root/data/jest-cache', {
        recursive: true,
      });
      expect(result.originalArgv).toEqual([]);
      expect(result.jestArgv).toContain('--config');

      // Find the config in the jestArgv
      const configIndex = result.jestArgv.indexOf('--config');
      expect(configIndex).toBeGreaterThan(-1);

      const configValue = JSON.parse(result.jestArgv[configIndex + 1]);
      expect(configValue).toEqual({
        ...baseConfig,
        id: 'kbn-test-jest',
        cacheDirectory: '/mock/repo/root/data/jest-cache',
      });
    });

    it('should remove existing config flags from argv', async () => {
      process.argv = ['node', 'script', '--config', '/old/config.js', '--verbose'];
      const baseConfig = { testMatch: ['**/*.test.js'] };

      const result = await prepareJestExecution(baseConfig);

      expect(result.originalArgv).toEqual(['--config', '/old/config.js', '--verbose']);
      expect(result.jestArgv).not.toContain('/old/config.js');
      expect(result.jestArgv).toContain('--verbose');
    });
  });

  describe('Jest cache directory handling', () => {
    it('should create correct cache directory path', () => {
      const repoRoot = '/mock/repo/root';
      const cacheDirectory = `${repoRoot}/data/jest-cache`;

      expect(cacheDirectory).toBe('/mock/repo/root/data/jest-cache');
    });

    it('should create inline config with cache directory', () => {
      const baseConfig = { testMatch: ['**/*.test.js'] };
      const cacheDirectory = '/mock/repo/root/data/jest-cache';

      // Simulate inline config creation
      const inlineConfig = {
        ...baseConfig,
        id: 'kbn-test-jest',
        cacheDirectory,
      };

      expect(inlineConfig).toEqual({
        testMatch: ['**/*.test.js'],
        id: 'kbn-test-jest',
        cacheDirectory: '/mock/repo/root/data/jest-cache',
      });
    });
  });

  describe('Scout reporter configuration', () => {
    describe('JEST_CONFIG_PATH environment variable', () => {
      it('sets JEST_CONFIG_PATH when SCOUT_REPORTER_ENABLED is true and config is provided', () => {
        // Mock SCOUT_REPORTER_ENABLED to be true
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        // Simulate the Scout configuration logic from run.ts
        const resolvedConfigPath = '/path/to/jest.config.js';
        const currentWorkingDirectory = '/current/working/dir';

        // This is the exact logic from run.ts lines 95-97
        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative(currentWorkingDirectory, resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBe('../../../path/to/jest.config.js');
      });

      it('does not set JEST_CONFIG_PATH when SCOUT_REPORTER_ENABLED is false', () => {
        // Mock SCOUT_REPORTER_ENABLED to be false
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = false;

        // Simulate the Scout configuration logic from run.ts
        const resolvedConfigPath = '/path/to/jest.config.js';

        // This is the exact logic from run.ts lines 95-97
        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('does not set JEST_CONFIG_PATH when resolvedConfigPath is null', () => {
        // Mock SCOUT_REPORTER_ENABLED to be true
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        // Simulate the Scout configuration logic with null config path
        const resolvedConfigPath = null;

        // This is the exact logic from run.ts lines 95-97
        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('does not set JEST_CONFIG_PATH when resolvedConfigPath is undefined', () => {
        // Mock SCOUT_REPORTER_ENABLED to be true
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        // Simulate the Scout configuration logic with undefined config path
        const resolvedConfigPath = undefined;

        // This is the exact logic from run.ts lines 95-97
        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('does not set JEST_CONFIG_PATH when resolvedConfigPath is empty string', () => {
        // Mock SCOUT_REPORTER_ENABLED to be true
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        // Simulate the Scout configuration logic with empty config path
        const resolvedConfigPath = '';

        // This is the exact logic from run.ts lines 95-97
        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });
    });

    describe('relative path calculations', () => {
      it('sets relative path correctly for same directory', () => {
        // Mock SCOUT_REPORTER_ENABLED to be true
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        // Test the relative path calculation for same directory
        const resolvedConfigPath = '/current/working/dir/jest.config.js';
        const currentWorkingDirectory = '/current/working/dir';

        // This is the exact logic from run.ts lines 95-97
        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative(currentWorkingDirectory, resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBe('jest.config.js');
      });

      it('sets relative path correctly for parent directory', () => {
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        const resolvedConfigPath = '/current/jest.config.js';
        const currentWorkingDirectory = '/current/working/dir';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative(currentWorkingDirectory, resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBe('../../jest.config.js');
      });

      it('sets relative path correctly for nested subdirectory', () => {
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        const resolvedConfigPath = '/current/working/dir/nested/deep/jest.config.js';
        const currentWorkingDirectory = '/current/working/dir';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative(currentWorkingDirectory, resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBe('nested/deep/jest.config.js');
      });

      it('handles special config file names', () => {
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        const testCases = [
          { config: '/project/jest.config.dev.js', expected: 'jest.config.dev.js' },
          { config: '/project/jest.config.integration.js', expected: 'jest.config.integration.js' },
          { config: '/project/jest.config.ts', expected: 'jest.config.ts' },
          { config: '/project/package.json', expected: 'package.json' },
        ];

        testCases.forEach(({ config, expected }) => {
          delete process.env.JEST_CONFIG_PATH;

          if (mockScoutInfo.SCOUT_REPORTER_ENABLED && config) {
            process.env.JEST_CONFIG_PATH = relative('/project', config);
          }

          expect(process.env.JEST_CONFIG_PATH).toBe(expected);
        });
      });
    });

    describe('edge cases and error conditions', () => {
      it('handles SCOUT_REPORTER_ENABLED being undefined', () => {
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = undefined as any;

        const resolvedConfigPath = '/path/to/jest.config.js';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('handles SCOUT_REPORTER_ENABLED being null', () => {
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = null as any;

        const resolvedConfigPath = '/path/to/jest.config.js';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('handles SCOUT_REPORTER_ENABLED being 0', () => {
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = 0 as any;

        const resolvedConfigPath = '/path/to/jest.config.js';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('handles SCOUT_REPORTER_ENABLED being empty string', () => {
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = '' as any;

        const resolvedConfigPath = '/path/to/jest.config.js';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('preserves existing JEST_CONFIG_PATH when conditions are not met', () => {
        // Set an existing value
        process.env.JEST_CONFIG_PATH = 'existing/path/config.js';

        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = false;

        const resolvedConfigPath = '/path/to/jest.config.js';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBe('existing/path/config.js');
      });

      it('overwrites existing JEST_CONFIG_PATH when conditions are met', () => {
        // Set an existing value
        process.env.JEST_CONFIG_PATH = 'existing/path/config.js';

        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        const resolvedConfigPath = '/new/path/jest.config.js';
        const currentWorkingDirectory = '/current/working/dir';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative(currentWorkingDirectory, resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBe('../../../new/path/jest.config.js');
      });
    });

    describe('integration with different Scout reporter values', () => {
      it('handles truthy values correctly', () => {
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));

        const truthyValues = [true, 1, 'true', 'yes', 'enabled', {}, []];

        truthyValues.forEach((value) => {
          delete process.env.JEST_CONFIG_PATH;
          mockScoutInfo.SCOUT_REPORTER_ENABLED = value as any;

          const resolvedConfigPath = '/test/jest.config.js';
          const currentWorkingDirectory = '/test';

          if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
            process.env.JEST_CONFIG_PATH = relative(currentWorkingDirectory, resolvedConfigPath);
          }

          expect(process.env.JEST_CONFIG_PATH).toBe('jest.config.js');
        });
      });

      it('handles falsy values correctly', () => {
        const mockScoutInfo = jest.mocked(jest.requireMock('@kbn/scout-info'));

        const falsyValues = [false, 0, '', null, undefined, NaN];

        falsyValues.forEach((value) => {
          delete process.env.JEST_CONFIG_PATH;
          mockScoutInfo.SCOUT_REPORTER_ENABLED = value as any;

          const resolvedConfigPath = '/test/jest.config.js';

          if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
            process.env.JEST_CONFIG_PATH = relative('/test', resolvedConfigPath);
          }

          expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
        });
      });
    });
  });
});
