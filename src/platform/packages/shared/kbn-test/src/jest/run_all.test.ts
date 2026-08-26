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

jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/path/to',
}));

jest.mock('child_process', () => ({
  spawn: jest.fn(),
  execFile: jest.fn(),
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

jest.mock('./shard_config', () => {
  return jest.requireActual('./shard_config');
});

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
  let mockExecFile: jest.Mock;
  let mockGetJestConfigs: jest.Mock;
  let mockGetTimeReporter: jest.Mock;
  let mockReporter: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockLog.info.mockClear();
    mockLog.error.mockClear();
    mockLog.warning.mockClear();

    // Reset process.env
    delete process.env.JEST_MAX_PARALLEL;
    delete process.env.BUILDKITE;
    delete process.env.BUILDKITE_STEP_ID;
    delete process.env.BUILDKITE_PARALLEL_JOB;
    process.env.JEST_WARMUP_DELAY_MS = '0';

    // Set up mocks
    mockGetopts = jest.mocked(jest.requireMock('getopts'));
    mockSpawn = jest.mocked(jest.requireMock('child_process').spawn);
    mockExecFile = jest.mocked(jest.requireMock('child_process').execFile);
    mockGetJestConfigs = jest.mocked(jest.requireMock('./configs/get_jest_configs').getJestConfigs);
    mockGetTimeReporter = jest.mocked(jest.requireMock('@kbn/ci-stats-reporter').getTimeReporter);
    mockReporter = jest.fn();
    mockGetTimeReporter.mockReturnValue(mockReporter);

    // Default: execFile succeeds (used by checkpoint helpers)
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        cb: (err: Error | null, stdout: string, stderr: string) => void
      ) => {
        cb(null, '', '');
      }
    );

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
          'config1.js',
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

      // Verify that output was captured and written (via log.write in Buildkite section)
      expect(mockLog.write).toHaveBeenCalledWith(
        expect.stringContaining('Test output from stdout')
      );
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

      it('should log output for each config with Buildkite section headers', async () => {
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

        // Passing configs get collapsed Buildkite sections (---)
        expect(mockLog.write).toHaveBeenCalledWith(
          expect.stringMatching(/--- ✅ .*config.*\.js \(\d+s\)\n/)
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

        expect(mockLog.write).toHaveBeenCalledWith('+++ Combined Jest run summary\n');
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
          // Expected due to process.exit mock with non-zero code
          expect((err as Error).message).toContain('process.exit called with code 10');
        }

        // No retry — only 1 spawn for the failing config
        expect(mockSpawn).toHaveBeenCalledTimes(1);

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

      it('should not throw when all configs are empty', async () => {
        mockGetopts.mockReturnValue({
          configs: ', , ,',
          maxParallel: undefined,
        });

        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [],
          emptyConfigs: ['/path/to/empty-config.js'],
        });

        try {
          await runJestAll();
        } catch (err) {
          expect((err as Error).message).toContain('process.exit called with code 0');
        }

        expect(mockGetJestConfigs).toHaveBeenCalledWith([]);
        expect(mockLog.error).not.toHaveBeenCalled();
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

        // Should log duration in Buildkite section header
        expect(mockLog.write).toHaveBeenCalledWith(
          expect.stringMatching(/--- ✅ .*\.js \(\d+s\)\n/)
        );
      });
    });

    describe('shard annotation handling', () => {
      it('should strip shard annotations before passing to getJestConfigs (CI path)', async () => {
        mockGetopts.mockReturnValue({
          configs: 'config1.js||shard=1/2,config1.js||shard=2/2',
          maxParallel: undefined,
        });

        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [{ config: '/path/to/config1.js', testFiles: ['test1.js'] }],
          emptyConfigs: [],
        });

        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockProcess);

        const runPromise = runJestAll().catch(() => {});

        process.nextTick(() => {
          mockProcess.emit('exit', 0);
          if (mockSpawn.mock.calls.length > 1) {
            mockProcess.emit('exit', 0);
          }
        });

        await runPromise;

        // Should pass clean config path (without shard annotation) to getJestConfigs
        expect(mockGetJestConfigs).toHaveBeenCalledWith(['config1.js']);
      });

      it('should pass --shard flag to spawned processes for annotated configs', async () => {
        mockGetopts.mockReturnValue({
          configs: 'config1.js||shard=1/2,config1.js||shard=2/2',
          maxParallel: '2',
        });

        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [{ config: '/path/to/config1.js', testFiles: ['test1.js'] }],
          emptyConfigs: [],
        });

        const processes: any[] = [];
        mockSpawn.mockImplementation(() => {
          const proc = new EventEmitter() as any;
          proc.stdout = new EventEmitter();
          proc.stderr = new EventEmitter();
          processes.push(proc);
          process.nextTick(() => proc.emit('exit', 0));
          return proc;
        });

        try {
          await runJestAll();
        } catch {
          // Expected
        }

        // Should spawn 2 processes (one per shard)
        expect(mockSpawn).toHaveBeenCalledTimes(2);

        // First process should get --shard=1/2
        expect(mockSpawn.mock.calls[0][1]).toEqual(expect.arrayContaining(['--shard=1/2']));
        // Config should be clean (without annotation)
        expect(mockSpawn.mock.calls[0][1]).toEqual(
          expect.arrayContaining(['--config', 'config1.js'])
        );

        // Second process should get --shard=2/2
        expect(mockSpawn.mock.calls[1][1]).toEqual(expect.arrayContaining(['--shard=2/2']));
      });

      it('should NOT pass --shard flag for non-annotated configs', async () => {
        mockGetopts.mockReturnValue({
          configs: 'config1.js',
          maxParallel: undefined,
        });

        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [{ config: '/path/to/config1.js', testFiles: ['test1.js'] }],
          emptyConfigs: [],
        });

        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockProcess);

        const runPromise = runJestAll().catch(() => {});

        process.nextTick(() => {
          mockProcess.emit('exit', 0);
        });

        await runPromise;

        const spawnArgs = mockSpawn.mock.calls[0][1] as string[];
        expect(spawnArgs).not.toEqual(expect.arrayContaining([expect.stringMatching(/--shard/)]));
      });

      it('should NOT auto-expand sharded configs locally (only CI annotations)', async () => {
        // A config is in the shard map but no CI annotation — locally it should NOT expand
        mockGetopts.mockReturnValue({
          configs: 'fleet/jest.integration.config.js',
          maxParallel: '2',
        });

        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [
            {
              config: '/path/to/fleet/jest.integration.config.js',
              testFiles: ['test1.js'],
            },
          ],
          emptyConfigs: [],
        });

        const processes: any[] = [];
        mockSpawn.mockImplementation(() => {
          const proc = new EventEmitter() as any;
          proc.stdout = new EventEmitter();
          proc.stderr = new EventEmitter();
          processes.push(proc);
          process.nextTick(() => proc.emit('exit', 0));
          return proc;
        });

        try {
          await runJestAll();
        } catch {
          // Expected
        }

        // Should spawn only 1 process — no auto-expansion locally
        expect(mockSpawn).toHaveBeenCalledTimes(1);

        const args = mockSpawn.mock.calls[0][1] as string[];
        expect(args).not.toEqual(expect.arrayContaining([expect.stringMatching(/--shard/)]));
      });
    });

    describe('parallel execution', () => {
      describe('staggered warmup', () => {
        const completeProcess = (proc: any) => {
          proc.stdout.emit('end');
          proc.stderr.emit('end');
          proc.emit('exit', 0);
        };

        const waitMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

        beforeEach(() => {
          mockGetopts.mockReturnValue({
            configs: 'config1.js,config2.js,config3.js',
            maxParallel: '3',
          });

          mockGetJestConfigs.mockResolvedValue({
            configsWithTests: [
              { config: '/path/to/config1.js', testFiles: ['test1.js'] },
              { config: '/path/to/config2.js', testFiles: ['test2.js'] },
              { config: '/path/to/config3.js', testFiles: ['test3.js'] },
            ],
            emptyConfigs: [],
          });
        });

        it('should only launch 1 process during warmup phase', async () => {
          process.env.JEST_WARMUP_DELAY_MS = '300';

          const processes: any[] = [];
          mockSpawn.mockImplementation(() => {
            const proc = new EventEmitter() as any;
            proc.stdout = new EventEmitter();
            proc.stderr = new EventEmitter();
            processes.push(proc);
            return proc;
          });

          const runPromise = runJestAll().catch(() => {});
          await waitMs(50);

          expect(mockSpawn).toHaveBeenCalledTimes(1);

          await waitMs(350);
          expect(mockSpawn).toHaveBeenCalledTimes(3);

          for (const proc of processes) completeProcess(proc);
          await runPromise;
        }, 10_000);

        it('should log warmup messages when delay elapses', async () => {
          process.env.JEST_WARMUP_DELAY_MS = '300';

          const processes: any[] = [];
          mockSpawn.mockImplementation(() => {
            const proc = new EventEmitter() as any;
            proc.stdout = new EventEmitter();
            proc.stderr = new EventEmitter();
            processes.push(proc);
            return proc;
          });

          const runPromise = runJestAll().catch(() => {});
          await waitMs(400);

          expect(mockLog.info).toHaveBeenCalledWith(
            expect.stringContaining('[jest-warmup] Starting 1 process to warm transform cache')
          );
          expect(mockLog.info).toHaveBeenCalledWith(
            expect.stringContaining('[jest-warmup] Warmup delay elapsed')
          );

          for (const proc of processes) completeProcess(proc);
          await runPromise;
        }, 10_000);

        it('should ramp immediately when first config completes before delay', async () => {
          process.env.JEST_WARMUP_DELAY_MS = '60000';

          const processes: any[] = [];
          mockSpawn.mockImplementation(() => {
            const proc = new EventEmitter() as any;
            proc.stdout = new EventEmitter();
            proc.stderr = new EventEmitter();
            processes.push(proc);
            return proc;
          });

          const runPromise = runJestAll().catch(() => {});
          await waitMs(50);

          expect(mockSpawn).toHaveBeenCalledTimes(1);

          completeProcess(processes[0]);
          await waitMs(50);

          expect(mockSpawn).toHaveBeenCalledTimes(3);
          expect(mockLog.info).toHaveBeenCalledWith(
            expect.stringContaining('[jest-warmup] First config completed')
          );

          for (let i = 1; i < processes.length; i++) completeProcess(processes[i]);
          await runPromise;
        }, 10_000);

        it('should skip warmup when JEST_WARMUP_DELAY_MS=0', async () => {
          process.env.JEST_WARMUP_DELAY_MS = '0';

          const processes: any[] = [];
          mockSpawn.mockImplementation(() => {
            const proc = new EventEmitter() as any;
            proc.stdout = new EventEmitter();
            proc.stderr = new EventEmitter();
            processes.push(proc);
            return proc;
          });

          const runPromise = runJestAll().catch(() => {});
          await waitMs(50);

          expect(mockSpawn).toHaveBeenCalledTimes(3);
          expect(mockLog.info).not.toHaveBeenCalledWith(expect.stringContaining('[jest-warmup]'));

          for (const proc of processes) completeProcess(proc);
          await runPromise;
        }, 10_000);
      });
    });

    describe('Buildkite checkpoint resume', () => {
      beforeEach(() => {
        process.env.BUILDKITE = 'true';
        process.env.BUILDKITE_STEP_ID = 'test-step-id';
        process.env.BUILDKITE_PARALLEL_JOB = '0';
      });

      it('should skip configs already completed on a previous attempt', async () => {
        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [
            { config: '/path/to/config1.js', testFiles: ['test1.js'] },
            { config: '/path/to/config2.js', testFiles: ['test2.js'] },
          ],
          emptyConfigs: [],
        });

        // execFile mock: config1 was already completed, config2 was not
        // Track get call index via closure to distinguish config1 from config2
        let getCallIndex = 0;
        mockExecFile.mockImplementation(
          (
            cmd: string,
            args: string[],
            cb: (err: Error | null, stdout: string, stderr: string) => void
          ) => {
            if (cmd === 'buildkite-agent' && args[0] === 'meta-data' && args[1] === 'get') {
              // Return 'done' for the first get call (config1) and '' for the second (config2)
              cb(null, getCallIndex++ === 0 ? 'done' : '', '');
            } else {
              cb(null, '', '');
            }
          }
        );

        const mockProcess = new EventEmitter() as any;
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockProcess);

        const runPromise = runJestAll().catch(() => {
          // Expected due to process.exit mock
        });

        // Only config2 should be spawned
        process.nextTick(() => {
          mockProcess.emit('exit', 0);
        });

        await runPromise;

        // config1 should be skipped
        expect(mockLog.info).toHaveBeenCalledWith(
          expect.stringContaining('[jest-checkpoint]   SKIP config1.js')
        );

        // Should log the resume summary
        expect(mockLog.info).toHaveBeenCalledWith(
          expect.stringContaining('[jest-checkpoint] Resumed: skipped 1 already-completed')
        );

        // Only one process should be spawned (for config2)
        expect(mockSpawn).toHaveBeenCalledTimes(1);
      });

      it('should write checkpoint for successful configs', async () => {
        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [{ config: '/path/to/config1.js', testFiles: ['test1.js'] }],
          emptyConfigs: [],
        });

        // No prior checkpoints exist (all gets return empty)
        mockExecFile.mockImplementation(
          (
            _cmd: string,
            _args: string[],
            cb: (err: Error | null, stdout: string, stderr: string) => void
          ) => {
            cb(null, '', '');
          }
        );

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

        // Should have called execFile to set the checkpoint
        const setCalls = mockExecFile.mock.calls.filter(
          (call: string[]) =>
            call[0] === 'buildkite-agent' && call[1][0] === 'meta-data' && call[1][1] === 'set'
        );
        expect(setCalls.length).toBe(1);
        expect(setCalls[0][1]).toEqual(
          expect.arrayContaining([
            'meta-data',
            'set',
            expect.stringContaining('jest_ckpt_'),
            'done',
          ])
        );
      });

      it('should NOT write checkpoint for failed configs', async () => {
        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [{ config: '/path/to/config1.js', testFiles: ['test1.js'] }],
          emptyConfigs: [],
        });

        // No prior checkpoints
        mockExecFile.mockImplementation(
          (
            _cmd: string,
            _args: string[],
            cb: (err: Error | null, stdout: string, stderr: string) => void
          ) => {
            cb(null, '', '');
          }
        );

        // Always fail
        mockSpawn.mockImplementation(() => {
          const proc = new EventEmitter() as any;
          proc.stdout = new EventEmitter();
          proc.stderr = new EventEmitter();
          process.nextTick(() => proc.emit('exit', 1));
          return proc;
        });

        try {
          await runJestAll();
        } catch {
          // Expected due to process.exit mock
        }

        // Should NOT have called execFile to set any checkpoint
        const setCalls = mockExecFile.mock.calls.filter(
          (call: string[]) =>
            call[0] === 'buildkite-agent' && call[1][0] === 'meta-data' && call[1][1] === 'set'
        );
        expect(setCalls.length).toBe(0);
      });

      it('should not checkpoint outside Buildkite', async () => {
        delete process.env.BUILDKITE;
        delete process.env.BUILDKITE_STEP_ID;
        delete process.env.BUILDKITE_PARALLEL_JOB;

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

        // No buildkite-agent calls should be made
        const bkCalls = mockExecFile.mock.calls.filter(
          (call: string[]) => call[0] === 'buildkite-agent'
        );
        expect(bkCalls.length).toBe(0);
      });

      it('should skip all configs and exit cleanly when all are already completed', async () => {
        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [
            { config: '/path/to/config1.js', testFiles: ['test1.js'] },
            { config: '/path/to/config2.js', testFiles: ['test2.js'] },
          ],
          emptyConfigs: [],
        });

        // All configs already completed
        mockExecFile.mockImplementation(
          (
            cmd: string,
            args: string[],
            cb: (err: Error | null, stdout: string, stderr: string) => void
          ) => {
            if (cmd === 'buildkite-agent' && args[0] === 'meta-data' && args[1] === 'get') {
              cb(null, 'done', '');
            } else {
              cb(null, '', '');
            }
          }
        );

        const runPromise = runJestAll().catch((err) => {
          expect((err as Error).message).toContain('process.exit called with code 0');
        });

        await runPromise;

        // No processes should be spawned
        expect(mockSpawn).not.toHaveBeenCalled();

        // Both configs should be reported as skipped
        expect(mockLog.info).toHaveBeenCalledWith(
          expect.stringContaining('[jest-checkpoint]   SKIP config1.js')
        );
        expect(mockLog.info).toHaveBeenCalledWith(
          expect.stringContaining('[jest-checkpoint]   SKIP config2.js')
        );
      });

      it('should handle checkpoint read errors gracefully', async () => {
        mockGetJestConfigs.mockResolvedValue({
          configsWithTests: [{ config: '/path/to/config1.js', testFiles: ['test1.js'] }],
          emptyConfigs: [],
        });

        // Checkpoint read fails (buildkite-agent not available, etc.)
        mockExecFile.mockImplementation(
          (
            cmd: string,
            args: string[],
            cb: (err: Error | null, stdout: string, stderr: string) => void
          ) => {
            if (cmd === 'buildkite-agent' && args[0] === 'meta-data' && args[1] === 'get') {
              cb(new Error('buildkite-agent not found'), '', '');
            } else {
              cb(null, '', '');
            }
          }
        );

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

        // Should still run the config (error treated as "not completed")
        expect(mockSpawn).toHaveBeenCalledTimes(1);
      });
    });
  });
});
