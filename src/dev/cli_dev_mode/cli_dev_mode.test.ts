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

import { REPO_ROOT, createAbsolutePathSerializer } from '@kbn/dev-utils';
import * as Rx from 'rxjs';

import { TestLog } from './log';
import { CliDevMode } from './cli_dev_mode';
import { FileChangeState } from './observe_file_changes';

expect.addSnapshotSerializer(createAbsolutePathSerializer());
expect.addSnapshotSerializer({
  test: (v) => v instanceof Rx.Observable,
  serialize: () => '<Rx.Observable>',
});

jest.mock('./observe_file_changes', () => ({
  observeFileChanges: jest.fn(),
}));
const { observeFileChanges } = jest.requireMock('./observe_file_changes');
observeFileChanges.mockImplementation(() => new Rx.Subject());

jest.mock('./observe_kbn_optimizer', () => ({
  observeKbnOptimizer: jest.fn(),
}));
const { observeKbnOptimizer } = jest.requireMock('./observe_kbn_optimizer');
observeKbnOptimizer.mockImplementation(() => new Rx.Subject());

jest.mock('./observe_dev_server', () => ({
  observeDevServer: jest.fn(),
}));
const { observeDevServer } = jest.requireMock('./observe_dev_server');
observeDevServer.mockImplementation(() => new Rx.Subject());

jest.mock('./get_server_watch_paths', () => ({
  getServerWatchPaths: jest.fn(),
}));
const { getServerWatchPaths } = jest.requireMock('./get_server_watch_paths');
getServerWatchPaths.mockImplementation(() => ({
  watchPaths: ['<mock watch paths>'],
  ignorePaths: ['<mock ignore paths>'],
}));

let processExitSpy: jest.SpyInstance;

beforeEach(() => {
  process.argv = ['node', './script', 'foo', 'bar', 'baz'];
  jest.clearAllMocks();
  processExitSpy = jest.spyOn(process, 'exit');
});

afterEach(() => {
  processExitSpy.mockRestore();
});

const getLastReturnedSubject = (mock: jest.Mock) => {
  const result = mock.mock.results[mock.mock.results.length - 1];
  if (!result || !(result.value instanceof Rx.Subject)) {
    throw new Error(`mock doesn't have any returned subjects`);
  }
  return result.value;
};

it('passes correct args to sub-tasks', () => {
  const log = new TestLog();
  const devMode = new CliDevMode({
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
  });

  devMode.start();
  const watchState$: Rx.Subject<FileChangeState> = getLastReturnedSubject(observeFileChanges);
  // indicate that the watcher is ready so the dev server is subscribed
  watchState$.next({
    type: 'ready',
    fileCount: 1,
  });

  expect(observeKbnOptimizer.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "cache": true,
          "dist": true,
          "oss": true,
          "pluginPaths": Array [],
          "quiet": false,
          "runExamples": false,
          "silent": false,
          "watch": true,
        },
      ],
    ]
  `);

  expect(observeFileChanges.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "cwd": <absolute path>,
          "ignore": Array [
            "<mock ignore paths>",
          ],
          "paths": Array [
            "<mock watch paths>",
          ],
        },
      ],
    ]
  `);

  expect(observeDevServer.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Object {
          "argv": Array [
            "foo",
            "bar",
            "baz",
          ],
          "gracefulTimeout": 5000,
          "restart$": <Rx.Observable>,
          "script": <absolute path>/src/cli/dev,
        },
      ],
    ]
  `);

  expect(log.messages).toMatchInlineSnapshot(`
    Array [
      Object {
        "args": Array [
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
          "====================================================================================================",
        ],
        "type": "warn",
      },
      Object {
        "args": Array [
          "watching for changes",
          "(1 files)",
        ],
        "type": "good",
      },
    ]
  `);
});
