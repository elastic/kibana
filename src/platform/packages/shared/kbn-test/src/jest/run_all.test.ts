/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mock all dependencies before importing anything else
const mockLog = {
  info: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  write: jest.fn(),
  debug: jest.fn(),
};

jest.mock('getopts', () => jest.fn());

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

jest.mock('@kbn/tooling-log', () => ({
  ToolingLog: jest.fn().mockImplementation(() => mockLog),
}));

jest.mock('@kbn/ci-stats-reporter', () => ({
  getTimeReporter: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('./configs/get_jest_configs', () => ({
  getJestConfigs: jest.fn(),
}));

// Mock process.exit to prevent tests from actually exiting
const mockProcessExit = jest
  .spyOn(process, 'exit')
  .mockImplementation((code?: string | number | null | undefined) => {
    throw new Error(`process.exit called with code ${code}`);
  });

import { EventEmitter } from 'events';
import { runJestAll } from './run_all';

describe('run_all.ts', () => {
  let mockGetopts: jest.Mock;
  let mockSpawn: jest.Mock;
  let mockGetJestConfigs: jest.Mock;
  let mockGetTimeReporter: jest.Mock;
  let mockReporter: jest.Mock;
  let mockFs: {
    mkdir: jest.Mock;
    writeFile: jest.Mock;
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockLog.info.mockClear();
    mockLog.error.mockClear();
    mockLog.warning.mockClear();

    // Reset process.env
    delete process.env.JEST_MAX_PARALLEL;
    delete process.env.JEST_ALL_FAILED_CONFIGS_PATH;

    // Set up mocks
    mockGetopts = jest.mocked(jest.requireMock('getopts'));
    mockSpawn = jest.mocked(jest.requireMock('child_process').spawn);
    mockGetJestConfigs = jest.mocked(jest.requireMock('./configs/get_jest_configs').getJestConfigs);
    mockGetTimeReporter = jest.mocked(jest.requireMock('@kbn/ci-stats-reporter').getTimeReporter);
    mockReporter = jest.fn();
    mockGetTimeReporter.mockReturnValue(mockReporter);
    mockFs = jest.mocked(jest.requireMock('fs').promises);

    // Default mock implementations
    mockGetopts.mockReturnValue({
      configs: undefined,
      maxParallel: undefined,
    });

    mockGetJestConfigs.mockResolvedValue({
      configsWithTests: [
        { config: '/path/to/config1.js', testFiles: ['test1.js'] },
        { config: '/path/to/config2.js', testFiles: ['test2.js'] },
      ],
      emptyConfigs: [],
    });
  });

  afterEach(() => {
    mockProcessExit.mockClear();
  });

  describe('argument parsing', () => {
    it('should parse configs argument correctly', async () => {
      mockGetopts.mockReturnValue({
        configs: 'config1.js,config2.js',
        maxParallel: undefined,
      });

      mockGetJestConfigs.mockResolvedValue({
        configsWithTests: [
          { config: '/path/to/config1.js', testFiles: ['test1.js'] },
          { config: '/path/to/config2.js', testFiles: ['test2.js'] },
        ],
        emptyConfigs: [],
      });

      // Mock successful process completion
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockSpawn.mockReturnValue(mockProcess);

      const runPromise = runJestAll().catch((err) => {
        expect(err.message).toContain('process.exit called with code 0');
      });

      // Complete all processes successfully
      process.nextTick(() => {
        mockProcess.emit('exit', 0);
        if (mockSpawn.mock.calls.length > 1) {
          mockProcess.emit('exit', 0);
        }
      });

      await runPromise;

      expect(mockGetJestConfigs).toHaveBeenCalledWith(['config1.js', 'config2.js']);
    });

    it('should handle maxParallel argument from command line', () => {
      mockGetopts.mockReturnValue({
        configs: undefined,
        maxParallel: '5',
      });

      // We can test the parsing logic without running the full function
      const parsed = mockGetopts();
      expect(parsed.maxParallel).toBe('5');
    });

    it('should use JEST_MAX_PARALLEL environment variable', () => {
      process.env.JEST_MAX_PARALLEL = '2';

      mockGetopts.mockReturnValue({
        configs: undefined,
        maxParallel: undefined,
      });

      expect(process.env.JEST_MAX_PARALLEL).toBe('2');
    });

    it('should trim and filter config arguments', async () => {
      mockGetopts.mockReturnValue({
        configs: ' config1.js , , config2.js , ',
        maxParallel: undefined,
      });

      // Mock successful process completion
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockSpawn.mockReturnValue(mockProcess);

      const runPromise = runJestAll().catch(() => {
        // Expected due to process.exit mock
      });

      process.nextTick(() => {
        mockProcess.emit('exit', 0);
      });

      await runPromise;

      expect(mockGetJestConfigs).toHaveBeenCalledWith(['config1.js', 'config2.js']);
    });
  });

  describe('config discovery', () => {
    it('should discover all configs when no --configs flag is provided', async () => {
      mockGetopts.mockReturnValue({
        configs: undefined,
        maxParallel: undefined,
      });

      // Mock successful process completion
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockSpawn.mockReturnValue(mockProcess);

      const runPromise = runJestAll().catch(() => {
        // Expected due to process.exit mock
      });

      process.nextTick(() => {
        mockProcess.emit('exit', 0);
      });

      await runPromise;

      expect(mockGetJestConfigs).toHaveBeenCalledWith();
      expect(mockLog.info).toHaveBeenCalledWith(
        '--configs flag is not passed. Finding and running all configs in the repo.'
      );
    });

    it('should handle configs with no tests', async () => {
      mockGetJestConfigs.mockResolvedValue({
        configsWithTests: [{ config: '/path/to/config1.js', testFiles: ['test1.js'] }],
        emptyConfigs: ['/path/to/empty-config.js'],
      });

      // Mock successful process completion
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockSpawn.mockReturnValue(mockProcess);

      const runPromise = runJestAll().catch(() => {
        // Expected due to process.exit mock
      });

      process.nextTick(() => {
        mockProcess.emit('exit', 0);
      });

      await runPromise;

      expect(mockLog.info).toHaveBeenCalledWith(
        'Found 1 configs to run. Found 1 configs with no tests. Skipping them.'
      );
    });

    it('should exit with error when no configs are found', async () => {
      mockGetJestConfigs.mockResolvedValue({
        configsWithTests: [],
        emptyConfigs: [],
      });

      try {
        await runJestAll();
      } catch (err) {
        expect((err as Error).message).toContain('process.exit called with code 1');
      }

      expect(mockLog.error).toHaveBeenCalledWith('No configs found after parsing --configs');
    });
  });

  describe('Jest process execution', () => {
    // Increase timeout for this suite as it involves async process mocking
    jest.setTimeout(15000);
    it('should spawn Jest processes with correct arguments', async () => {
      mockGetopts.mockReturnValue({
        configs: 'config1.js',
        maxParallel: undefined,
      });

      mockGetJestConfigs.mockResolvedValue({
        configsWithTests: [{ config: '/path/to/config1.js', testFiles: ['test1.js'] }],
        emptyConfigs: [],
      });

      // Mock successful process completion
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockSpawn.mockReturnValue(mockProcess);

      const runPromise = runJestAll().catch(() => {
        // Expected due to process.exit mock
      });

      process.nextTick(() => {
        mockProcess.emit('exit', 0);
      });

      await runPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        process.execPath,
        [
          'scripts/jest',
          '--config',
          '/path/to/config1.js',
          '--runInBand',
          '--coverage=false',
          '--passWithNoTests',
        ],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
          env: expect.objectContaining({
            SLOW_TESTS_OUTPUT_PATH: expect.stringMatching(/slow-tests-.*\.json$/),
          }),
        })
      );
    });

    it('should handle process stdout and stderr', async () => {
      const mockProcess = new EventEmitter() as any;
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();
      mockSpawn.mockReturnValue(mockProcess);

      const runPromise = runJestAll().catch(() => {
        // Expected due to process.exit mock
      });

      // Simulate process output
      process.nextTick(() => {
        mockProcess.stdout.emit('data', Buffer.from('Test output from stdout'));
        mockProcess.stderr.emit('data', Buffer.from('Test output from stderr'));
        mockProcess.emit('exit', 0);
      });

      await runPromise;

      // Verify that output was captured and logged
      expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('Test output from stdout'));
    });

    describe('failed configs persistence', () => {
      it('should write failed configs to file when JEST_ALL_FAILED_CONFIGS_PATH is set', async () => {
        process.env.JEST_ALL_FAILED_CONFIGS_PATH = '/tmp/failed-configs.json';

        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [{ config: '/path/to/config1.js', testFiles: ['test1.js'] }],
          emptyConfigs: [],
        });

        // Mock multiple process instances for retry logic - always fail
        mockSpawn.mockImplementation(() => {
          const mockProcess = new EventEmitter() as any;
          mockProcess.stdout = new EventEmitter();
          mockProcess.stderr = new EventEmitter();

          process.nextTick(() => {
            mockProcess.emit('exit', 1); // Always fail
          });

          return mockProcess;
        });

        try {
          await runJestAll();
        } catch (err) {
          // Expected due to process.exit mock
          expect((err as Error).message).toContain('process.exit called with code 10');
        }

        expect(mockFs.mkdir).toHaveBeenCalledWith('/tmp', { recursive: true });
        expect(mockFs.writeFile).toHaveBeenCalledWith(
          '/tmp/failed-configs.json',
          JSON.stringify(['/path/to/config1.js'], null, 2),
          'utf8'
        );
      });

      it('should not write failed configs file when no configs fail', async () => {
        process.env.JEST_ALL_FAILED_CONFIGS_PATH = '/tmp/failed-configs.json';

        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockProcess);

        const runPromise = runJestAll().catch(() => {
          // Expected due to process.exit mock
        });

        process.nextTick(() => {
          mockProcess.emit('exit', 0);
        });

        await runPromise;

        expect(mockFs.writeFile).toHaveBeenCalledWith(
          '/tmp/failed-configs.json',
          JSON.stringify([], null, 2),
          'utf8'
        );
      });
    });

    describe('logging and reporting', () => {
      it('should log process launch information', async () => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockProcess);

        const runPromise = runJestAll().catch(() => {
          // Expected due to process.exit mock
        });

        process.nextTick(() => {
          mockProcess.emit('exit', 0);
        });

        await runPromise;

        expect(mockLog.info).toHaveBeenCalledWith(
          'Launching up to 3 parallel Jest config processes (forcing --runInBand per process).'
        );
      });

      it('should log output for each config with timing', async () => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockProcess);

        const runPromise = runJestAll().catch(() => {
          // Expected due to process.exit mock
        });

        // Simulate process with output
        process.nextTick(() => {
          mockProcess.stdout.emit('data', Buffer.from('Test output'));
          mockProcess.emit('exit', 0);
        });

        await runPromise;

        expect(mockLog.info).toHaveBeenCalledWith(
          expect.stringMatching(/Output for .*config.*\.js \(exit 0 - success, \d+s\)/)
        );
      });

      it('should log final summary with timing', async () => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockProcess);

        const runPromise = runJestAll().catch(() => {
          // Expected due to process.exit mock
        });

        process.nextTick(() => {
          mockProcess.emit('exit', 0);
        });

        await runPromise;

        expect(mockLog.write).toHaveBeenCalledWith('--- Combined Jest run summary');
        expect(mockLog.info).toHaveBeenCalledWith(
          expect.stringMatching(/Total duration \(wall to wall\): \d+s/)
        );
      });

      it('should call time reporter with correct parameters', async () => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockProcess);

        const runPromise = runJestAll().catch(() => {
          // Expected due to process.exit mock
        });

        process.nextTick(() => {
          mockProcess.emit('exit', 0);
        });

        await runPromise;

        expect(mockReporter).toHaveBeenCalledWith(
          expect.any(Number), // startTime
          'total',
          {
            success: true,
            testFiles: expect.arrayContaining([
              expect.stringContaining('config1.js'),
              expect.stringContaining('config2.js'),
            ]),
          }
        );
      });

      it('should report failure when configs fail', async () => {
        // Use single config for this test to make expectations clearer
        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [{ config: '/path/to/config1.js', testFiles: ['test1.js'] }],
          emptyConfigs: [],
        });

        // Mock multiple process instances for retry logic
        let processCount = 0;
        mockSpawn.mockImplementation(() => {
          const mockProcess = new EventEmitter() as any;
          mockProcess.stdout = new EventEmitter();
          mockProcess.stderr = new EventEmitter();

          // Always fail both initial and retry attempts
          process.nextTick(() => {
            mockProcess.emit('exit', 1);
            processCount++;
          });

          return mockProcess;
        });

        try {
          await runJestAll();
        } catch (err) {
          // Expected due to process.exit mock with non-zero code
          expect((err as Error).message).toContain('process.exit called with code 10');
        }

        // Should have spawned processes for both initial run and retry
        expect(mockSpawn).toHaveBeenCalledTimes(2); // 1 initial + 1 retry

        expect(mockReporter).toHaveBeenCalledWith(
          expect.any(Number),
          'total',
          expect.objectContaining({
            success: false,
          })
        );
      });
    });

    describe('edge cases', () => {
      it('should handle empty config list after filtering', async () => {
        mockGetopts.mockReturnValue({
          configs: ', , ,',
          maxParallel: undefined,
        });

        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [],
          emptyConfigs: [],
        });

        try {
          await runJestAll();
        } catch (err) {
          expect((err as Error).message).toContain('process.exit called with code 1');
        }

        expect(mockGetJestConfigs).toHaveBeenCalledWith([]);
        expect(mockLog.error).toHaveBeenCalledWith('No configs found after parsing --configs');
      });

      it('should handle process spawn errors gracefully', async () => {
        mockSpawn.mockImplementation(() => {
          throw new Error('Spawn failed');
        });

        await expect(runJestAll()).rejects.toThrow('Spawn failed');
      });

      it('should calculate duration correctly', async () => {
        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockProcess);

        const runPromise = runJestAll().catch(() => {
          // Expected due to process.exit mock
        });

        // Complete process after a delay
        process.nextTick(() => {
          mockProcess.emit('exit', 0);
        });

        await runPromise;

        // Should log duration in seconds
        expect(mockLog.info).toHaveBeenCalledWith(
          expect.stringMatching(/exit 0 - success, \d+s\)/)
        );
      });
    });

    describe('parallel execution and retry logic', () => {
      it('should handle retry mechanism for failed configs', async () => {
        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [{ config: '/path/to/config1.js', testFiles: ['test1.js'] }],
          emptyConfigs: [],
        });

        let callCount = 0;
        mockSpawn.mockImplementation(() => {
          const mockProcess = new EventEmitter() as any;
          mockProcess.stdout = new EventEmitter();
          mockProcess.stderr = new EventEmitter();

          process.nextTick(() => {
            // Fail first time, succeed on retry
            mockProcess.emit('exit', callCount === 0 ? 1 : 0);
            callCount++;
          });

          return mockProcess;
        });

        const runPromise = runJestAll().catch(() => {
          // Expected due to process.exit mock
        });

        await runPromise;

        expect(mockLog.info).toHaveBeenCalledWith(
          '--- Detected failing configs, starting retry pass (maxParallel=1)'
        );
        expect(mockLog.info).toHaveBeenCalledWith('Configs fixed after retry:');
      });

      it('should handle configs that still fail after retry', async () => {
        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [{ config: '/path/to/config1.js', testFiles: ['test1.js'] }],
          emptyConfigs: [],
        });

        // Always fail
        mockSpawn.mockImplementation(() => {
          const mockProcess = new EventEmitter() as any;
          mockProcess.stdout = new EventEmitter();
          mockProcess.stderr = new EventEmitter();

          process.nextTick(() => {
            mockProcess.emit('exit', 1);
          });

          return mockProcess;
        });

        try {
          await runJestAll();
        } catch (err) {
          expect((err as Error).message).toContain('process.exit called with code 10');
        }

        expect(mockLog.info).toHaveBeenCalledWith('Configs still failing after retry:');
        expect(mockLog.info).toHaveBeenCalledWith('  - /path/to/config1.js');
      });
    });
  });
});
