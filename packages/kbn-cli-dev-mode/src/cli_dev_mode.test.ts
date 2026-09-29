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

import Path from 'path';
import * as Rx from 'rxjs';
import { createAbsolutePathSerializer, createAnyInstanceSerializer } from '@kbn/jest-serializers';
import { CiStatsReporter as CiStatsReporterClass } from '@kbn/ci-stats-reporter';

import { REPO_ROOT } from '@kbn/repo-info';

import { TestLog } from './log';
import type { SomeCliArgs } from './cli_dev_mode';
import { CliDevMode } from './cli_dev_mode';
import type { CliDevConfig } from './config';
import { Watcher as WatcherClass } from './watcher';
import { Optimizer as OptimizerClass } from './optimizer';
import { DevServer as DevServerClass } from './dev_server';
import { getBasePathProxyServer as getBasePathProxyServerFn } from './base_path_proxy';

expect.addSnapshotSerializer(createAbsolutePathSerializer());
expect.addSnapshotSerializer(createAnyInstanceSerializer(Rx.Observable, 'Rx.Observable'));
expect.addSnapshotSerializer(createAnyInstanceSerializer(TestLog));

vi.mock('./watcher');
const Watcher = WatcherClass as unknown as Mock;

vi.mock('./optimizer');
const Optimizer = OptimizerClass as unknown as Mock;

vi.mock('./dev_server');
const DevServer = DevServerClass as unknown as Mock;

vi.mock('./base_path_proxy');
const getBasePathProxyServer = getBasePathProxyServerFn as unknown as Mock;

vi.mock('@kbn/ci-stats-reporter');
const CiStatsReporter = CiStatsReporterClass as unknown as { fromEnv: Mock };

const mockBasePathProxy = {
  targetPort: 9999,
  basePath: '/foo/bar',
  host: 'localhost',
  port: 5601,
  start: vi.fn(),
  stop: vi.fn(),
};

let log: TestLog;

beforeEach(() => {
  process.argv = ['node', './script', 'foo', 'bar', 'baz'];
  log = new TestLog();
  getBasePathProxyServer.mockImplementation(() => mockBasePathProxy);
});

afterEach(() => {
  vi.clearAllMocks();
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
  http: { ssl: { enabled: false } } as any,
  ...parts,
});

const createOptions = ({ cliArgs = {} }: { cliArgs?: Partial<SomeCliArgs> } = {}) => ({
  cliArgs: createCliArgs(cliArgs),
  config: createDevConfig(),
  log,
});

it('passes correct args to sub-classes', () => {
  new CliDevMode(createOptions());

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
          "proxyUrl": undefined,
          "script": <absolute path>/scripts/kibana,
          "watcher": Mock {
            "constructor": [MockFunction],
            "optimizerShouldRestart$": [MockFunction],
            "serverShouldRestart$": [MockFunction],
          },
        },
      ],
    ]
  `);
  expect(Optimizer.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "allowlistPluginGroups": undefined,
          "basePath": undefined,
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

  expect(getBasePathProxyServer).not.toHaveBeenCalled();

  expect(log.messages).toMatchInlineSnapshot(`Array []`);
});

it('disables the optimizer', () => {
  new CliDevMode(createOptions({ cliArgs: { disableOptimizer: true } }));

  expect(Optimizer.mock.calls[0][0]).toHaveProperty('enabled', false);
});

it('disables the watcher', () => {
  new CliDevMode(createOptions({ cliArgs: { watch: false } }));

  expect(Optimizer.mock.calls[0][0]).toHaveProperty('watch', false);
  expect(Watcher.mock.calls[0][0]).toHaveProperty('enabled', false);
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
        "httpConfig": Object {
          "ssl": Object {
            "enabled": false,
          },
        },
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
  let processExitMock: MockInstance;

  beforeAll(() => {
    processExitMock = vi.spyOn(process, 'exit').mockImplementation(
      // @ts-expect-error process.exit isn't supposed to return
      () => {}
    );
  });

  beforeEach(() => {
    Optimizer.mockImplementation(() => {
      optimizerRun$ = new Rx.Subject();
      optimizerReady$ = new Rx.Subject();
      return {
        isReady$: vi.fn(() => optimizerReady$),
        getPhase$: vi.fn(() => Rx.NEVER),
        run$: optimizerRun$,
      };
    });
    Watcher.mockImplementation(() => {
      watcherRun$ = new Rx.Subject();
      return {
        run$: watcherRun$,
        optimizerShouldRestart$: vi.fn(() => Rx.NEVER),
      };
    });
    DevServer.mockImplementation(() => {
      devServerRun$ = new Rx.Subject();
      devServerReady$ = new Rx.Subject();
      return {
        isReady$: vi.fn(() => devServerReady$),
        getPhase$: vi.fn(() => Rx.NEVER),
        run$: devServerRun$,
      };
    });
    CiStatsReporter.fromEnv.mockImplementation(() => {
      return {
        isEnabled: vi.fn().mockReturnValue(false),
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

  it('logs a warning if basePathProxy is not passed', () => {
    new CliDevMode(createOptions()).start();

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

  it('calls start on BasePathProxy if enabled', () => {
    new CliDevMode(createOptions({ cliArgs: { basePath: true } })).start();

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

  it('subscribes to Optimizer#run$, Watcher#run$, and DevServer#run$', () => {
    new CliDevMode(createOptions()).start();

    expect(optimizerRun$.observers).toHaveLength(1);
    expect(watcherRun$.observers).toHaveLength(1);
    expect(devServerRun$.observers).toHaveLength(1);
  });

  it('logs an error and exits the process if Optimizer#run$ errors', () => {
    new CliDevMode(createOptions({ cliArgs: { basePath: true } })).start();

    expect(processExitMock).not.toHaveBeenCalled();
    optimizerRun$.error({ stack: 'Error: foo bar' });
    expect(log.messages).toMatchInlineSnapshot(`
      Array [
        Object {
          "args": Array [
            "[@kbn/rspack-optimizer] fatal error",
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

  it('logs an error and exits the process if Watcher#run$ errors', () => {
    new CliDevMode(createOptions({ cliArgs: { basePath: true } })).start();

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

  it('logs an error and exits the process if DevServer#run$ errors', () => {
    new CliDevMode(createOptions({ cliArgs: { basePath: true } })).start();

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

  it('throws if start() has already been called', () => {
    expect(() => {
      const devMode = new CliDevMode(createOptions({ cliArgs: { basePath: true } }));

      devMode.start();
      devMode.start();
    }).toThrowErrorMatchingInlineSnapshot(`[Error: CliDevMode already started]`);
  });

  it('unsubscribes from all observables and stops basePathProxy when stopped', () => {
    const devMode = new CliDevMode(createOptions({ cliArgs: { basePath: true } }));

    devMode.start();
    devMode.stop();

    expect(optimizerRun$.observers).toHaveLength(0);
    expect(watcherRun$.observers).toHaveLength(0);
    expect(devServerRun$.observers).toHaveLength(0);
    expect(mockBasePathProxy.stop).toHaveBeenCalledTimes(1);
  });
});
