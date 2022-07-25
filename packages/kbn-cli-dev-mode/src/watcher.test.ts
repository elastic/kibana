/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventEmitter } from 'events';

import * as Rx from 'rxjs';
import { materialize, toArray } from 'rxjs/operators';

import { TestLog } from './log';
import { Watcher, Options } from './watcher';

class MockChokidar extends EventEmitter {
  close = jest.fn();
}

let mockChokidar: MockChokidar | undefined;
jest.mock('chokidar');
const chokidar = jest.requireMock('chokidar');
function isMock(mock: MockChokidar | undefined): asserts mock is MockChokidar {
  expect(mock).toBeInstanceOf(MockChokidar);
}

chokidar.watch.mockImplementation(() => {
  mockChokidar = new MockChokidar();
  return mockChokidar;
});

const subscriptions: Rx.Subscription[] = [];
const run = (watcher: Watcher) => {
  const subscription = watcher.run$.subscribe({
    error(e) {
      throw e;
    },
  });
  subscriptions.push(subscription);
  return subscription;
};

const log = new TestLog();
const defaultOptions: Options = {
  enabled: true,
  log,
  paths: ['foo.js', 'bar.js'],
  ignore: [/^f/],
  cwd: '/app/repo',
};

afterEach(() => {
  jest.clearAllMocks();

  if (mockChokidar) {
    mockChokidar.removeAllListeners();
    mockChokidar = undefined;
  }

  for (const sub of subscriptions) {
    sub.unsubscribe();
  }

  subscriptions.length = 0;
  log.messages.length = 0;
});

it('completes restart streams immediately when disabled', () => {
  const watcher = new Watcher({
    ...defaultOptions,
    enabled: false,
  });

  const restart$ = new Rx.BehaviorSubject<void>(undefined);
  subscriptions.push(watcher.serverShouldRestart$().subscribe(restart$));

  run(watcher);
  expect(restart$.isStopped).toBe(true);
});

it('calls chokidar.watch() with expected arguments', () => {
  const watcher = new Watcher(defaultOptions);
  expect(chokidar.watch).not.toHaveBeenCalled();
  run(watcher);
  expect(chokidar.watch.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        Array [
          "foo.js",
          "bar.js",
        ],
        Object {
          "cwd": "/app/repo",
          "ignored": Array [
            /\\^f/,
          ],
        },
      ],
    ]
  `);
});

it('closes chokidar watcher when unsubscribed', () => {
  const sub = run(new Watcher(defaultOptions));
  isMock(mockChokidar);
  expect(mockChokidar.close).not.toHaveBeenCalled();
  sub.unsubscribe();
  expect(mockChokidar.close).toHaveBeenCalledTimes(1);
});

it('rethrows chokidar errors', async () => {
  const watcher = new Watcher(defaultOptions);
  const promise = Rx.firstValueFrom(watcher.run$.pipe(materialize(), toArray()));

  isMock(mockChokidar);
  mockChokidar.emit('error', new Error('foo bar'));

  const notifications = await promise;
  expect(notifications).toMatchInlineSnapshot(`
    Array [
      Notification {
        "error": [Error: foo bar],
        "hasValue": false,
        "kind": "E",
        "value": undefined,
      },
    ]
  `);
});

it('logs the count of add events after the ready event', () => {
  run(new Watcher(defaultOptions));
  isMock(mockChokidar);

  mockChokidar.emit('add');
  mockChokidar.emit('add');
  mockChokidar.emit('add');
  mockChokidar.emit('add');
  mockChokidar.emit('ready');

  expect(log.messages).toMatchInlineSnapshot(`
    Array [
      Object {
        "args": Array [
          "watching for changes",
          "(4 files)",
        ],
        "type": "good",
      },
    ]
  `);
});

it('buffers subsequent changes before logging and notifying serverShouldRestart$', async () => {
  const watcher = new Watcher(defaultOptions);

  const history: any[] = [];
  subscriptions.push(
    watcher
      .serverShouldRestart$()
      .pipe(materialize())
      .subscribe((n) => history.push(n))
  );

  run(watcher);
  expect(history).toMatchInlineSnapshot(`Array []`);

  isMock(mockChokidar);
  mockChokidar.emit('ready');
  mockChokidar.emit('all', ['add', 'foo.js']);
  mockChokidar.emit('all', ['add', 'bar.js']);
  mockChokidar.emit('all', ['delete', 'bar.js']);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  expect(log.messages).toMatchInlineSnapshot(`
    Array [
      Object {
        "args": Array [
          "watching for changes",
          "(0 files)",
        ],
        "type": "good",
      },
      Object {
        "args": Array [
          "restarting server",
          "due to changes in
     - \\"foo.js\\"
     - \\"bar.js\\"",
        ],
        "type": "warn",
      },
    ]
  `);

  expect(history).toMatchInlineSnapshot(`
    Array [
      Notification {
        "error": undefined,
        "hasValue": true,
        "kind": "N",
        "value": undefined,
      },
    ]
  `);
});
