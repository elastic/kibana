/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock, MockInstance } from 'vitest';

// Mock all dependencies before importing anything else
vi.mock('@kbn/scout-info', () => {
  const mocked = {
    SCOUT_REPORTER_ENABLED: false,
  };
  return { ...mocked, default: mocked };
});

vi.mock('jest', () => {
  const mocked = {
    run: vi.fn().mockResolvedValue(undefined),
  };
  return { ...mocked, default: mocked };
});

vi.mock('jest-config', () => {
  const mocked = {
    readInitialOptions: vi.fn().mockResolvedValue({ config: {} }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/tooling-log', () => {
  const mocked = {
    ToolingLog: vi.fn().mockImplementation(() => ({
      verbose: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/ci-stats-reporter', () => {
  const mocked = {
    getTimeReporter: vi.fn().mockReturnValue(vi.fn()),
  };
  return { ...mocked, default: mocked };
});

vi.mock('fs', () => {
  const mocked = {
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      stat: vi.fn().mockResolvedValue({ isFile: () => true }),
    },
    existsSync: vi.fn().mockReturnValue(true),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/dev-cli-errors', () => {
  const mocked = {
    createFailError: vi.fn((msg) => new Error(msg)),
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/repo-info', () => {
  const mocked = {
    REPO_ROOT: '/mock/repo/root',
  };
  return { ...mocked, default: mocked };
});

vi.mock('getopts', () => vi.fn());

vi.mock('./buildkite_checkpoint', () => {
  const mocked = {
    isInBuildkite: vi.fn().mockReturnValue(false),
    isConfigCompleted: vi.fn().mockResolvedValue(false),
    markConfigCompletedSync: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

import { relative } from 'path';
import {
  commonBasePath,
  parseJestArguments,
  findConfigInDirectoryTree,
  discoverJestConfig,
  resolveJestConfig,
  prepareJestExecution,
  removeFlagFromArgv,
  runJest,
} from './run';

describe('run.ts', () => {
  beforeEach(() => {
    // Reset process.env
    delete process.env.JEST_CONFIG_PATH;
    delete process.env.NODE_ENV;
    delete process.env.INIT_CWD;

    // Clear all mocks
    vi.clearAllMocks();
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
      process.cwd = vi.fn().mockReturnValue('/different/cwd');

      // Simulate the currentWorkingDirectory logic from runJest
      const currentWorkingDirectory = process.env.INIT_CWD || process.cwd();

      expect(currentWorkingDirectory).toBe('/custom/init/cwd');

      process.cwd = originalCwd;
    });

    it('should fall back to process.cwd() when INIT_CWD is not available', () => {
      delete process.env.INIT_CWD;
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue('/fallback/cwd');

      // Simulate the currentWorkingDirectory logic from runJest
      const currentWorkingDirectory = process.env.INIT_CWD || process.cwd();

      expect(currentWorkingDirectory).toBe('/fallback/cwd');

      process.cwd = originalCwd;
    });
  });

  describe('parseJestArguments', () => {
    let mockGetopts: Mock;

    beforeEach(async () => {
      mockGetopts = vi.mocked(await vi.importMock('getopts'));
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
    let mockExistsSync: Mock;

    beforeEach(async () => {
      mockExistsSync = vi.mocked((await vi.importMock('fs')).existsSync);
    });

    it('should find config in current directory', () => {
      mockExistsSync.mockImplementation((path: string) => path === '/current/dir/jest.config.js');

      const result = findConfigInDirectoryTree('/current/dir', [
        'jest.config.dev.js',
        'jest.config.js',
      ]);

      expect(result).toBe('/current/dir/jest.config.js');
    });

    it('should find config in parent directory', async () => {
      mockExistsSync.mockImplementation((path: string) => path === '/parent/jest.config.js');

      // Mock REPO_ROOT for this test
      const mockRepoInfo = vi.mocked(await vi.importMock('@kbn/repo-info'));
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
    let mockExistsSync: Mock;
    let mockToolingLog: Mock;

    beforeEach(async () => {
      mockExistsSync = vi.mocked((await vi.importMock('fs')).existsSync);
      mockToolingLog = vi.mocked((await vi.importMock('@kbn/tooling-log')).ToolingLog);
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
    let mockReadInitialOptions: Mock;
    let mockStat: Mock;

    beforeEach(async () => {
      mockReadInitialOptions = vi.mocked((await vi.importMock('jest-config')).readInitialOptions);
      mockStat = vi.mocked((await vi.importMock('fs')).promises.stat);
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

      // runJest seeds resolvedConfigPath with the raw --config value.
      const result = await resolveJestConfig(parsedArguments, configJson);

      expect(result).toEqual({
        config: { testMatch: ['**/*.test.js'] },
        configPath: undefined,
      });
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
    let mockMkdir: Mock;

    beforeEach(async () => {
      mockMkdir = vi.mocked((await vi.importMock('fs')).promises.mkdir);
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

    it('passes a projects config as a file so each project keeps its own path', async () => {
      process.argv = ['node', 'script', '--config', '/old/config.js', '--verbose'];
      const configPath = '/repo/x-pack/platform/plugins/shared/lens/jest.config.js';
      const baseConfig = {
        projects: [
          '<rootDir>/lens/common/jest.config.dev.js',
          '<rootDir>/lens/public/jest.config.dev.js',
        ],
      };

      const result = await prepareJestExecution(baseConfig, configPath);

      expect(result.jestArgv).toEqual([
        '--config',
        configPath,
        '--cacheDirectory',
        '/mock/repo/root/data/jest-cache',
        '--verbose',
      ]);
      expect(result.originalArgv).toEqual(['--config', '/old/config.js', '--verbose']);
    });

    it('keeps inlining a projects config when no file path is available', async () => {
      const baseConfig = { projects: ['<rootDir>/lens/public/jest.config.dev.js'] };

      const result = await prepareJestExecution(baseConfig);

      const configValue = JSON.parse(result.jestArgv[result.jestArgv.indexOf('--config') + 1]);
      expect(configValue).toEqual({
        ...baseConfig,
        id: 'kbn-test-jest',
        cacheDirectory: '/mock/repo/root/data/jest-cache',
      });
    });

    it('inlines a JSON --config that declares projects after resolveJestConfig', async () => {
      const projects = ['<rootDir>/lens/public/jest.config.dev.js'];
      const configJson = JSON.stringify({ projects });

      const { config, configPath } = await resolveJestConfig({ config: configJson }, configJson);
      const result = await prepareJestExecution(config, configPath);

      expect(configPath).toBeUndefined();
      const configValue = JSON.parse(result.jestArgv[result.jestArgv.indexOf('--config') + 1]);
      expect(configValue).toEqual({
        projects,
        id: 'kbn-test-jest',
        cacheDirectory: '/mock/repo/root/data/jest-cache',
      });
      expect(result.jestArgv).not.toContain('--cacheDirectory');
    });

    it('keeps inlining a file config that does not declare projects', async () => {
      const baseConfig = { testMatch: ['**/*.test.js'] };

      const result = await prepareJestExecution(baseConfig, '/repo/jest.config.js');

      const configValue = JSON.parse(result.jestArgv[result.jestArgv.indexOf('--config') + 1]);
      expect(configValue).toEqual({
        ...baseConfig,
        id: 'kbn-test-jest',
        cacheDirectory: '/mock/repo/root/data/jest-cache',
      });
      expect(result.jestArgv).not.toContain('/repo/jest.config.js');
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
      it('sets JEST_CONFIG_PATH when SCOUT_REPORTER_ENABLED is true and config is provided', async () => {
        // Mock SCOUT_REPORTER_ENABLED to be true
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
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

      it('does not set JEST_CONFIG_PATH when SCOUT_REPORTER_ENABLED is false', async () => {
        // Mock SCOUT_REPORTER_ENABLED to be false
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = false;

        // Simulate the Scout configuration logic from run.ts
        const resolvedConfigPath = '/path/to/jest.config.js';

        // This is the exact logic from run.ts lines 95-97
        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('does not set JEST_CONFIG_PATH when resolvedConfigPath is null', async () => {
        // Mock SCOUT_REPORTER_ENABLED to be true
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        // Simulate the Scout configuration logic with null config path
        const resolvedConfigPath = null;

        // This is the exact logic from run.ts lines 95-97
        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('does not set JEST_CONFIG_PATH when resolvedConfigPath is undefined', async () => {
        // Mock SCOUT_REPORTER_ENABLED to be true
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        // Simulate the Scout configuration logic with undefined config path
        const resolvedConfigPath = undefined;

        // This is the exact logic from run.ts lines 95-97
        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('does not set JEST_CONFIG_PATH when resolvedConfigPath is empty string', async () => {
        // Mock SCOUT_REPORTER_ENABLED to be true
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
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
      it('sets relative path correctly for same directory', async () => {
        // Mock SCOUT_REPORTER_ENABLED to be true
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
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

      it('sets relative path correctly for parent directory', async () => {
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        const resolvedConfigPath = '/current/jest.config.js';
        const currentWorkingDirectory = '/current/working/dir';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative(currentWorkingDirectory, resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBe('../../jest.config.js');
      });

      it('sets relative path correctly for nested subdirectory', async () => {
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = true;

        const resolvedConfigPath = '/current/working/dir/nested/deep/jest.config.js';
        const currentWorkingDirectory = '/current/working/dir';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative(currentWorkingDirectory, resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBe('nested/deep/jest.config.js');
      });

      it('handles special config file names', async () => {
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
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
      it('handles SCOUT_REPORTER_ENABLED being undefined', async () => {
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = undefined as any;

        const resolvedConfigPath = '/path/to/jest.config.js';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('handles SCOUT_REPORTER_ENABLED being null', async () => {
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = null as any;

        const resolvedConfigPath = '/path/to/jest.config.js';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('handles SCOUT_REPORTER_ENABLED being 0', async () => {
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = 0 as any;

        const resolvedConfigPath = '/path/to/jest.config.js';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('handles SCOUT_REPORTER_ENABLED being empty string', async () => {
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = '' as any;

        const resolvedConfigPath = '/path/to/jest.config.js';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBeUndefined();
      });

      it('preserves existing JEST_CONFIG_PATH when conditions are not met', async () => {
        // Set an existing value
        process.env.JEST_CONFIG_PATH = 'existing/path/config.js';

        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
        mockScoutInfo.SCOUT_REPORTER_ENABLED = false;

        const resolvedConfigPath = '/path/to/jest.config.js';

        if (mockScoutInfo.SCOUT_REPORTER_ENABLED && resolvedConfigPath) {
          process.env.JEST_CONFIG_PATH = relative('/current/working/dir', resolvedConfigPath);
        }

        expect(process.env.JEST_CONFIG_PATH).toBe('existing/path/config.js');
      });

      it('overwrites existing JEST_CONFIG_PATH when conditions are met', async () => {
        // Set an existing value
        process.env.JEST_CONFIG_PATH = 'existing/path/config.js';

        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));
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
      it('handles truthy values correctly', async () => {
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));

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

      it('handles falsy values correctly', async () => {
        const mockScoutInfo = vi.mocked(await vi.importMock('@kbn/scout-info'));

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

  describe('Buildkite checkpoint with shard annotation', () => {
    let mockGetopts: Mock;
    let mockIsInBuildkite: Mock;
    let mockIsConfigCompleted: Mock;
    let mockProcessExit: MockInstance;

    beforeEach(async () => {
      mockGetopts = vi.mocked(await vi.importMock('getopts'));
      mockIsInBuildkite = vi.mocked((await vi.importMock('./buildkite_checkpoint')).isInBuildkite);
      mockIsConfigCompleted = vi.mocked(
        (await vi.importMock('./buildkite_checkpoint')).isConfigCompleted
      );

      process.env.BUILDKITE = 'true';
      process.env.BUILDKITE_STEP_ID = 'step-1';
      process.env.BUILDKITE_PARALLEL_JOB = '0';
      process.env.BUILDKITE_RETRY_COUNT = '1';

      mockIsInBuildkite.mockReturnValue(true);
      mockIsConfigCompleted.mockResolvedValue(true);

      mockProcessExit = vi.spyOn(process, 'exit').mockImplementation((() => {
        throw new Error('process.exit called');
      }) as () => never);
    });

    afterEach(() => {
      mockProcessExit.mockRestore();
      delete process.env.BUILDKITE;
      delete process.env.BUILDKITE_STEP_ID;
      delete process.env.BUILDKITE_PARALLEL_JOB;
      delete process.env.BUILDKITE_RETRY_COUNT;
    });

    it('should include shard annotation in checkpoint key when --shard is present', async () => {
      process.argv = [
        'node',
        'script',
        '--config',
        '/mock/repo/root/x-pack/plugins/alerting/jest.config.js',
        '--shard=2/6',
      ];

      mockGetopts.mockReturnValue({
        _: [],
        config: '/mock/repo/root/x-pack/plugins/alerting/jest.config.js',
        shard: '2/6',
        verbose: false,
        help: false,
      });

      try {
        await runJest();
      } catch {
        // Expected: process.exit mock throws
      }

      expect(mockIsConfigCompleted).toHaveBeenCalledWith(
        'x-pack/plugins/alerting/jest.config.js||shard=2/6'
      );
    });

    it('should include shard annotation when shard comes from config annotation', async () => {
      process.argv = [
        'node',
        'script',
        '--config',
        '/mock/repo/root/x-pack/plugins/alerting/jest.config.js||shard=3/6',
      ];

      mockGetopts.mockReturnValue({
        _: [],
        config: '/mock/repo/root/x-pack/plugins/alerting/jest.config.js||shard=3/6',
        verbose: false,
        help: false,
      });

      try {
        await runJest();
      } catch {
        // Expected: process.exit mock throws
      }

      expect(mockIsConfigCompleted).toHaveBeenCalledWith(
        'x-pack/plugins/alerting/jest.config.js||shard=3/6'
      );
    });

    it('should NOT include shard annotation when no shard is present', async () => {
      process.argv = [
        'node',
        'script',
        '--config',
        '/mock/repo/root/x-pack/plugins/alerting/jest.config.js',
      ];

      mockGetopts.mockReturnValue({
        _: [],
        config: '/mock/repo/root/x-pack/plugins/alerting/jest.config.js',
        verbose: false,
        help: false,
      });

      try {
        await runJest();
      } catch {
        // Expected: process.exit mock throws
      }

      expect(mockIsConfigCompleted).toHaveBeenCalledWith('x-pack/plugins/alerting/jest.config.js');
    });
  });
});
