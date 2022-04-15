/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import * as Rx from 'rxjs';
import { createAbsolutePathSerializer, createAnyInstanceSerializer } from '@kbn/dev-utils';

import { REPO_ROOT } from '@kbn/utils';

import { TestLog } from './log';
import { CliDevMode, SomeCliArgs } from './cli_dev_mode';
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

jest.mock('./base_path_proxy_server');
const { BasePathProxyServer } = jest.requireMock('./base_path_proxy_server');

jest.mock('@kbn/ci-stats-reporter');
const { CiStatsReporter } = jest.requireMock('@kbn/ci-stats-reporter');

jest.mock('./get_server_watch_paths', () => ({
  getServerWatchPaths: jest.fn(() => ({
    watchPaths: ['<mock watch paths>'],
    ignorePaths: ['<mock ignore paths>'],
  })),
}));

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
  BasePathProxyServer.mockImplementation(() => mockBasePathProxy);
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
          "script": <absolute path>/scripts/kibana,
          "watcher": Watcher {
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
          "cache": true,
          "dist": true,
          "enabled": true,
          "oss": true,
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
          "cwd": <absolute path>,
          "enabled": true,
          "ignore": Array [
            "<mock ignore paths>",
          ],
          "log": <TestLog>,
          "paths": Array [
            "<mock watch paths>",
          ],
        },
      ],
    ]
  `);

  expect(BasePathProxyServer).not.toHaveBeenCalled();

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

  expect(BasePathProxyServer).toHaveBeenCalledTimes(1);
  expect(BasePathProxyServer.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      <TestLog>,
      Object {},
      Object {
        "basePathProxyTargetPort": 9000,
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
    }).toThrowErrorMatchingInlineSnapshot(`"CliDevMode already started"`);
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
