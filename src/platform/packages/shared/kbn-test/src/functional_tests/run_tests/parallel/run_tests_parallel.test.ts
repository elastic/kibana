/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExecaReturnValue } from 'execa';

import { runTestsParallel } from './run_tests_parallel';
import type { ToolingLog } from '@kbn/tooling-log';

jest.mock('child_process', () => ({
  execSync: jest.fn(() => ''),
}));

jest.mock('./create_es_cache_symlink', () => ({
  createEsCacheSymlink: jest.fn(async () => undefined),
}));

jest.mock('./start_watching_files', () => ({
  startWatchingFiles: jest.fn(() => ({
    getFormattedFileChanges: jest.fn(() => ''),
    unsubscribe: jest.fn(),
  })),
}));

jest.mock('@kbn/test-services', () => ({
  acquirePorts: jest.fn(async () => ({
    agentless: '6200',
    es: '6201',
    esTransport: '6202',
    packageRegistry: '6203',
    kibana: '6204',
    fleet: '6205',
  })),
}));

jest.mock('./read_config', () => ({
  readConfig: jest.fn(async () => ({
    getAll: () => ({}),
    get: () => undefined,
  })),
}));

jest.mock('./get_slot_resources', () => ({
  getSlotResources: jest.fn(() => ({
    warming: { cpu: 1, memory: 1024, exclusive: false },
    idle: { cpu: 0.5, memory: 512, exclusive: false },
    running: { cpu: 1, memory: 1024, exclusive: false },
  })),
}));

jest.mock('./prepare_chrome', () => ({
  prepareChrome: jest.fn(async () => undefined),
}));

jest.mock('./config_runner', () => {
  const createMockDeferred = <T>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return { promise, resolve, reject };
  };

  const instances: MockConfigRunner[] = [];

  class MockConfigRunner {
    public readonly startDeferred = createMockDeferred<void>();
    public readonly runDeferred = createMockDeferred<ExecaReturnValue<string>>();
    public readonly start = jest.fn(() => this.startDeferred.promise);
    public readonly run = jest.fn(() => this.runDeferred.promise);
    private readonly configPath: string;

    constructor(options: { path: string }) {
      this.configPath = options.path;
      instances.push(this);
    }

    getConfigPath() {
      return this.configPath;
    }
  }

  return {
    ConfigRunner: MockConfigRunner,
    __mockConfigRunnerInstances: instances,
  };
});

jest.mock('./get_available_memory', () => ({
  getAvailableMemory: jest.fn(() => 64 * 1024),
}));

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('runTestsParallel', () => {
  const CONFIG_A =
    'src/platform/packages/shared/kbn-test/src/functional_tests/run_tests/parallel/__fixtures__/config_stub.js';
  const CONFIG_B =
    'src/platform/packages/shared/kbn-test/src/functional_tests/run_tests/parallel/__fixtures__/config_stub_b.js';

  let log: jest.Mocked<ToolingLog>;

  beforeEach(() => {
    log = {
      info: jest.fn(),
      debug: jest.fn(),
      indent: jest.fn(),
      write: jest.fn(),
      warning: jest.fn(),
      success: jest.fn(),
      error: jest.fn(),
      clone: jest.fn(),
      withTags: jest.fn(),
    } as unknown as jest.Mocked<ToolingLog>;

    Object.assign(process.env, {
      USE_CHROME_BETA: undefined,
      SCOUT_REPORTER_ENABLED: undefined,
    });
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('prevents later configs from running before earlier configs enter running phase', async () => {
    const { __mockConfigRunnerInstances } = jest.requireMock('./config_runner') as {
      __mockConfigRunnerInstances: Array<{
        start: jest.Mock;
        run: jest.Mock;
        startDeferred: ReturnType<typeof createDeferred<void>>;
        runDeferred: ReturnType<typeof createDeferred<ExecaReturnValue<string>>>;
      }>;
    };

    const runPromise = runTestsParallel(log, [CONFIG_A, CONFIG_B], {
      extraArgs: [],
      stdio: 'suppress',
    });

    await flushPromises();

    expect(__mockConfigRunnerInstances).toHaveLength(2);

    const [runnerA, runnerB] = __mockConfigRunnerInstances;

    const mockResult: ExecaReturnValue<string> = {
      command: 'node scripts/functional_tests',
      escapedCommand: 'node scripts/functional_tests',
      exitCode: 0,
      stdout: '',
      stderr: '',
      all: '',
      failed: false,
      timedOut: false,
      killed: false,
      signal: undefined,
      signalDescription: undefined,
      isCanceled: false,
    };

    runnerB.startDeferred.resolve();
    await flushPromises();

    expect(runnerB.run).not.toHaveBeenCalled();

    runnerA.startDeferred.resolve();
    await flushPromises();

    expect(runnerA.run).toHaveBeenCalledTimes(1);
    expect(runnerB.run).not.toHaveBeenCalled();

    runnerA.runDeferred.resolve(mockResult);
    await flushPromises();

    expect(runnerB.run).toHaveBeenCalledTimes(1);

    runnerB.runDeferred.resolve(mockResult);
    await runPromise;
  });
});
