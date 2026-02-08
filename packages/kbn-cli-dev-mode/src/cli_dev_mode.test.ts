/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import * as Rx from 'rxjs';
import { createAbsolutePathSerializer, createAnyInstanceSerializer } from '@kbn/jest-serializers';

import { REPO_ROOT } from '@kbn/repo-info';

import { TestLog } from './log';
import type { SomeCliArgs } from './cli_dev_mode';
import { CliDevMode } from './cli_dev_mode';
import type { CliDevConfig } from './config';

expect.addSnapshotSerializer(createAbsolutePathSerializer());
expect.addSnapshotSerializer(createAnyInstanceSerializer(Rx.Observable, 'Rx.Observable'));
expect.addSnapshotSerializer(createAnyInstanceSerializer(TestLog));

jest.mock('./watcher');
const { Watcher } = jest.requireMock('./watcher');

jest.mock('./optimizer');
const { Optimizer } = jest.requireMock('./optimizer');

jest.mock('./dev_server');
const { DevServer } = jest.requireMock('./dev_server');

jest.mock('./base_path_proxy');
const { getBasePathProxyServer } = jest.requireMock('./base_path_proxy');

jest.mock('@kbn/ci-stats-reporter');
const { CiStatsReporter } = jest.requireMock('@kbn/ci-stats-reporter');

const mockBasePathProxy = {
  targetPort: 9999,
  basePath: '/foo/bar',
  start: jest.fn(),
  stop: jest.fn(),
};

let log: TestLog;

beforeEach(() => {
  process.argv = ['node', './script', 'foo', 'bar', 'baz'];
  log = new TestLog();
  getBasePathProxyServer.mockImplementation(() => mockBasePathProxy);
});

afterEach(() => {
  jest.clearAllMocks();
  mockBasePathProxy.start.mockReset();
  mockBasePathProxy.stop.mockReset();
});

const createCliArgs = (parts: Partial<SomeCliArgs> = {}): SomeCliArgs => ({
  basePath: false,
  cache: true,
  disableOptimizer: false,
  dist: true,
  oss: true,
  runExamples: false,
  watch: true,
  silent: false,
  ...parts,
});

const createDevConfig = (parts: Partial<CliDevConfig> = {}): CliDevConfig => ({
  plugins: {
    pluginSearchPaths: [Path.resolve(REPO_ROOT, 'src/plugins')],
    additionalPluginPaths: [],
  },
  dev: {
    basePathProxyTargetPort: 9000,
  },
  http: {} as any,
  ...parts,
});

const createOptions = ({ cliArgs = {} }: { cliArgs?: Partial<SomeCliArgs> } = {}) => ({
  cliArgs: createCliArgs(cliArgs),
  config: createDevConfig(),
  log,
});

it('passes correct args to sub-classes', async () => {
  // Set up minimal mocks so start() can complete
  const optimizerRun$ = new Rx.Subject<void>();
  const optimizerReady$ = new Rx.Subject<boolean>();
  const devServerRun$ = new Rx.Subject<void>();
  const devServerReady$ = new Rx.Subject<boolean>();
  Optimizer.mockImplementation(() => ({
    isReady$: jest.fn(() => optimizerReady$),
    getPhase$: jest.fn(() => Rx.NEVER),
    run$: optimizerRun$,
  }));
  DevServer.mockImplementation(() => ({
    isReady$: jest.fn(() => devServerReady$),
    getPhase$: jest.fn(() => Rx.NEVER),
    run$: devServerRun$,
  }));
  Watcher.mockImplementation(() => ({
    run$: new Rx.Subject(),
    serverShouldRestart$: jest.fn(),
  }));
  CiStatsReporter.fromEnv.mockImplementation(() => ({
    isEnabled: jest.fn().mockReturnValue(false),
  }));

  const devMode = new CliDevMode(createOptions());

  expect(DevServer.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "argv": Array [
            "foo",
            "bar",
            "baz",
          ],
          "gracefulTimeout": 30000,
          "log": <TestLog>,
          "mapLogLine": [Function],
          "script": <absolute path>/scripts/kibana.mts,
          "watcher": Watcher {
            "serverShouldRestart$": [MockFunction],
          },
        },
      ],
    ]
  `);
  expect(Watcher.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "enabled": true,
          "log": <TestLog>,
          "repoRoot": <absolute path>,
        },
      ],
    ]
  `);

  // Optimizer is now lazily loaded in start()
  await devMode.start();
  expect(Optimizer.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "cache": true,
          "dist": true,
          "enabled": true,
          "pluginPaths": Array [],
          "pluginScanDirs": Array [
            <absolute path>/src/plugins,
          ],
          "quiet": false,
          "repoRoot": <absolute path>,
          "runExamples": false,
          "silent": false,
          "verbose": false,
          "watch": true,
        },
      ],
    ]
  `);

  expect(getBasePathProxyServer).not.toHaveBeenCalled();

  expect(log.messages).toMatchInlineSnapshot(`
    Array [
      Object {
        "args": Array [
          "no-base-path",
          "====================================================================================================",
        ],
        "type": "warn",
      },
      Object {
        "args": Array [
          "no-base-path",
          "Running Kibana in dev mode with --no-base-path disables several useful features and is not recommended",
        ],
        "type": "warn",
      },
      Object {
        "args": Array [
          "no-base-path",
          "====================================================================================================",
        ],
        "type": "warn",
      },
    ]
  `);

  Optimizer.mockReset();
  DevServer.mockReset();
  Watcher.mockReset();
});

it('disables the optimizer', async () => {
  // Set up minimal mocks
  Optimizer.mockImplementation(() => ({
    isReady$: jest.fn(() => new Rx.Subject()),
    getPhase$: jest.fn(() => Rx.NEVER),
    run$: new Rx.Subject(),
  }));
  DevServer.mockImplementation(() => ({
    isReady$: jest.fn(() => new Rx.Subject()),
    getPhase$: jest.fn(() => Rx.NEVER),
    run$: new Rx.Subject(),
  }));
  Watcher.mockImplementation(() => ({
    run$: new Rx.Subject(),
    serverShouldRestart$: jest.fn(),
  }));
  CiStatsReporter.fromEnv.mockImplementation(() => ({
    isEnabled: jest.fn().mockReturnValue(false),
  }));

  const devMode = new CliDevMode(createOptions({ cliArgs: { disableOptimizer: true } }));
  await devMode.start();

  expect(Optimizer.mock.calls[0][0]).toHaveProperty('enabled', false);

  Optimizer.mockReset();
  DevServer.mockReset();
  Watcher.mockReset();
});

it('disables the watcher', async () => {
  // Set up minimal mocks
  Optimizer.mockImplementation(() => ({
    isReady$: jest.fn(() => new Rx.Subject()),
    getPhase$: jest.fn(() => Rx.NEVER),
    run$: new Rx.Subject(),
  }));
  DevServer.mockImplementation(() => ({
    isReady$: jest.fn(() => new Rx.Subject()),
    getPhase$: jest.fn(() => Rx.NEVER),
    run$: new Rx.Subject(),
  }));
  Watcher.mockImplementation(() => ({
    run$: new Rx.Subject(),
    serverShouldRestart$: jest.fn(),
  }));
  CiStatsReporter.fromEnv.mockImplementation(() => ({
    isEnabled: jest.fn().mockReturnValue(false),
  }));

  const devMode = new CliDevMode(createOptions({ cliArgs: { watch: false } }));
  await devMode.start();

  expect(Optimizer.mock.calls[0][0]).toHaveProperty('watch', false);
  expect(Watcher.mock.calls[0][0]).toHaveProperty('enabled', false);

  Optimizer.mockReset();
  DevServer.mockReset();
  Watcher.mockReset();
});

it('enables the basePath proxy', () => {
  new CliDevMode(createOptions({ cliArgs: { basePath: true } }));

  expect(getBasePathProxyServer).toHaveBeenCalledTimes(1);
  expect(getBasePathProxyServer.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "devConfig": Object {
          "basePathProxyTargetPort": 9000,
        },
        "httpConfig": Object {},
        "log": <TestLog>,
      },
    ]
  `);

  expect(DevServer.mock.calls[0][0].argv).toMatchInlineSnapshot(`
    Array [
      "foo",
      "bar",
      "baz",
      "--server.port=9999",
      "--server.basePath=/foo/bar",
      "--server.rewriteBasePath=true",
    ]
  `);
});

describe('#start()/#stop()', () => {
  let optimizerRun$: Rx.Subject<void>;
  let optimizerReady$: Rx.Subject<void>;
  let watcherRun$: Rx.Subject<void>;
  let devServerRun$: Rx.Subject<void>;
  let devServerReady$: Rx.Subject<void>;
  let processExitMock: jest.SpyInstance;

  beforeAll(() => {
    processExitMock = jest.spyOn(process, 'exit').mockImplementation(
      // @ts-expect-error process.exit isn't supposed to return
      () => {}
    );
  });

  beforeEach(() => {
    Optimizer.mockImplementation(() => {
      optimizerRun$ = new Rx.Subject();
      optimizerReady$ = new Rx.Subject();
      return {
        isReady$: jest.fn(() => optimizerReady$),
        getPhase$: jest.fn(() => Rx.NEVER),
        run$: optimizerRun$,
      };
    });
    Watcher.mockImplementation(() => {
      watcherRun$ = new Rx.Subject();
      return {
        run$: watcherRun$,
      };
    });
    DevServer.mockImplementation(() => {
      devServerRun$ = new Rx.Subject();
      devServerReady$ = new Rx.Subject();
      return {
        isReady$: jest.fn(() => devServerReady$),
        getPhase$: jest.fn(() => Rx.NEVER),
        run$: devServerRun$,
      };
    });
    CiStatsReporter.fromEnv.mockImplementation(() => {
      return {
        isEnabled: jest.fn().mockReturnValue(false),
      };
    });
  });

  afterEach(() => {
    Optimizer.mockReset();
    Watcher.mockReset();
    DevServer.mockReset();
  });

  afterAll(() => {
    processExitMock.mockRestore();
  });

  it('logs a warning if basePathProxy is not passed', async () => {
    await new CliDevMode(createOptions()).start();

    expect(log.messages).toMatchInlineSnapshot(`
      Array [
        Object {
          "args": Array [
            "no-base-path",
            "====================================================================================================",
          ],
          "type": "warn",
        },
        Object {
          "args": Array [
            "no-base-path",
            "Running Kibana in dev mode with --no-base-path disables several useful features and is not recommended",
          ],
          "type": "warn",
        },
        Object {
          "args": Array [
            "no-base-path",
            "====================================================================================================",
          ],
          "type": "warn",
        },
      ]
    `);
  });

  it('calls start on BasePathProxy if enabled', async () => {
    await new CliDevMode(createOptions({ cliArgs: { basePath: true } })).start();

    expect(mockBasePathProxy.start.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "delayUntil": [Function],
            "shouldRedirectFromOldBasePath": [Function],
          },
        ],
      ]
    `);
  });

  it('subscribes to Optimizer#run$, Watcher#run$, and DevServer#run$', async () => {
    await new CliDevMode(createOptions()).start();

    expect(optimizerRun$.observers).toHaveLength(1);
    expect(watcherRun$.observers).toHaveLength(1);
    expect(devServerRun$.observers).toHaveLength(1);
  });

  it('logs an error and exits the process if Optimizer#run$ errors', async () => {
    await new CliDevMode(createOptions({ cliArgs: { basePath: true } })).start();

    expect(processExitMock).not.toHaveBeenCalled();
    optimizerRun$.error({ stack: 'Error: foo bar' });
    expect(log.messages).toMatchInlineSnapshot(`
      Array [
        Object {
          "args": Array [
            "[@kbn/optimizer] fatal error",
            "Error: foo bar",
          ],
          "type": "bad",
        },
      ]
    `);
    expect(processExitMock.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          1,
        ],
      ]
    `);
  });

  it('logs an error and exits the process if Watcher#run$ errors', async () => {
    await new CliDevMode(createOptions({ cliArgs: { basePath: true } })).start();

    expect(processExitMock).not.toHaveBeenCalled();
    watcherRun$.error({ stack: 'Error: foo bar' });
    expect(log.messages).toMatchInlineSnapshot(`
      Array [
        Object {
          "args": Array [
            "[watcher] fatal error",
            "Error: foo bar",
          ],
          "type": "bad",
        },
      ]
    `);
    expect(processExitMock.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          1,
        ],
      ]
    `);
  });

  it('logs an error and exits the process if DevServer#run$ errors', async () => {
    await new CliDevMode(createOptions({ cliArgs: { basePath: true } })).start();

    expect(processExitMock).not.toHaveBeenCalled();
    devServerRun$.error({ stack: 'Error: foo bar' });
    expect(log.messages).toMatchInlineSnapshot(`
      Array [
        Object {
          "args": Array [
            "[dev server] fatal error",
            "Error: foo bar",
          ],
          "type": "bad",
        },
      ]
    `);
    expect(processExitMock.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          1,
        ],
      ]
    `);
  });

  it('throws if start() has already been called', async () => {
    const devMode = new CliDevMode(createOptions({ cliArgs: { basePath: true } }));

    await devMode.start();
    await expect(devMode.start()).rejects.toThrowError('CliDevMode already started');
  });

  it('unsubscribes from all observables and stops basePathProxy when stopped', async () => {
    const devMode = new CliDevMode(createOptions({ cliArgs: { basePath: true } }));

    await devMode.start();
    devMode.stop();

    expect(optimizerRun$.observers).toHaveLength(0);
    expect(watcherRun$.observers).toHaveLength(0);
    expect(devServerRun$.observers).toHaveLength(0);
    expect(mockBasePathProxy.stop).toHaveBeenCalledTimes(1);
  });
});
