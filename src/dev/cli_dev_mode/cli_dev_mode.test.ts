/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';

import {
  REPO_ROOT,
  createAbsolutePathSerializer,
  createAnyInstanceSerializer,
} from '@kbn/dev-utils';
import * as Rx from 'rxjs';

import { TestLog } from './log';
import { CliDevMode } from './cli_dev_mode';

expect.addSnapshotSerializer(createAbsolutePathSerializer());
expect.addSnapshotSerializer(createAnyInstanceSerializer(Rx.Observable, 'Rx.Observable'));
expect.addSnapshotSerializer(createAnyInstanceSerializer(TestLog));

jest.mock('./watcher');
const { Watcher } = jest.requireMock('./watcher');

jest.mock('./optimizer');
const { Optimizer } = jest.requireMock('./optimizer');

jest.mock('./dev_server');
const { DevServer } = jest.requireMock('./dev_server');

jest.mock('./get_server_watch_paths', () => ({
  getServerWatchPaths: jest.fn(() => ({
    watchPaths: ['<mock watch paths>'],
    ignorePaths: ['<mock ignore paths>'],
  })),
}));

beforeEach(() => {
  process.argv = ['node', './script', 'foo', 'bar', 'baz'];
  jest.clearAllMocks();
});

const log = new TestLog();

const mockBasePathProxy = {
  targetPort: 9999,
  basePath: '/foo/bar',
  start: jest.fn(),
  stop: jest.fn(),
};

const defaultOptions = {
  cache: true,
  disableOptimizer: false,
  dist: true,
  oss: true,
  pluginPaths: [],
  pluginScanDirs: [Path.resolve(REPO_ROOT, 'src/plugins')],
  quiet: false,
  silent: false,
  runExamples: false,
  watch: true,
  log,
};

afterEach(() => {
  log.messages.length = 0;
});

it('passes correct args to sub-classes', () => {
  new CliDevMode(defaultOptions);

  expect(DevServer.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "argv": Array [
            "foo",
            "bar",
            "baz",
          ],
          "gracefulTimeout": 5000,
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
          "quiet": false,
          "repoRoot": <absolute path>,
          "runExamples": false,
          "silent": false,
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
  expect(log.messages).toMatchInlineSnapshot(`Array []`);
});

it('disables the optimizer', () => {
  new CliDevMode({
    ...defaultOptions,
    disableOptimizer: true,
  });

  expect(Optimizer.mock.calls[0][0]).toHaveProperty('enabled', false);
});

it('disables the watcher', () => {
  new CliDevMode({
    ...defaultOptions,
    watch: false,
  });

  expect(Optimizer.mock.calls[0][0]).toHaveProperty('watch', false);
  expect(Watcher.mock.calls[0][0]).toHaveProperty('enabled', false);
});

it('overrides the basePath of the server when basePathProxy is defined', () => {
  new CliDevMode({
    ...defaultOptions,
    basePathProxy: mockBasePathProxy as any,
  });

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
        run$: devServerRun$,
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
    new CliDevMode({
      ...defaultOptions,
    }).start();

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
    const basePathProxy: any = {
      start: jest.fn(),
    };

    new CliDevMode({
      ...defaultOptions,
      basePathProxy,
    }).start();

    expect(basePathProxy.start.mock.calls).toMatchInlineSnapshot(`
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
    new CliDevMode(defaultOptions).start();

    expect(optimizerRun$.observers).toHaveLength(1);
    expect(watcherRun$.observers).toHaveLength(1);
    expect(devServerRun$.observers).toHaveLength(1);
  });

  it('logs an error and exits the process if Optimizer#run$ errors', () => {
    new CliDevMode({
      ...defaultOptions,
      basePathProxy: mockBasePathProxy as any,
    }).start();

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
    new CliDevMode({
      ...defaultOptions,
      basePathProxy: mockBasePathProxy as any,
    }).start();

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
    new CliDevMode({
      ...defaultOptions,
      basePathProxy: mockBasePathProxy as any,
    }).start();

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
      const devMode = new CliDevMode({
        ...defaultOptions,
        basePathProxy: mockBasePathProxy as any,
      });

      devMode.start();
      devMode.start();
    }).toThrowErrorMatchingInlineSnapshot(`"CliDevMode already started"`);
  });

  it('unsubscribes from all observables and stops basePathProxy when stopped', () => {
    const devMode = new CliDevMode({
      ...defaultOptions,
      basePathProxy: mockBasePathProxy as any,
    });

    devMode.start();
    devMode.stop();

    expect(optimizerRun$.observers).toHaveLength(0);
    expect(watcherRun$.observers).toHaveLength(0);
    expect(devServerRun$.observers).toHaveLength(0);
    expect(mockBasePathProxy.stop).toHaveBeenCalledTimes(1);
  });
});
