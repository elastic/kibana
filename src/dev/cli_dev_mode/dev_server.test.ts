/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventEmitter } from 'events';
import { PassThrough } from 'stream';

import * as Rx from 'rxjs';

import { extendedEnvSerializer } from './test_helpers';
import { DevServer, Options } from './dev_server';
import { TestLog } from './log';

class MockProc extends EventEmitter {
  public readonly signalsSent: string[] = [];

  stdout = new PassThrough();
  stderr = new PassThrough();

  kill = jest.fn((signal) => {
    this.signalsSent.push(signal);
  });

  mockExit(code: number) {
    this.emit('exit', code, undefined);
    // close stdio streams
    this.stderr.end();
    this.stdout.end();
  }

  mockListening() {
    this.emit('message', ['SERVER_LISTENING'], undefined);
  }
}

jest.mock('execa');
const execa = jest.requireMock('execa');

let currentProc: MockProc | undefined;
execa.node.mockImplementation(() => {
  const proc = new MockProc();
  currentProc = proc;
  return proc;
});
function isProc(proc: MockProc | undefined): asserts proc is MockProc {
  expect(proc).toBeInstanceOf(MockProc);
}

const restart$ = new Rx.Subject<void>();
const mockWatcher = {
  enabled: true,
  serverShouldRestart$: jest.fn(() => restart$),
};

const processExit$ = new Rx.Subject<void>();
const sigint$ = new Rx.Subject<void>();
const sigterm$ = new Rx.Subject<void>();

const log = new TestLog();
const defaultOptions: Options = {
  log,
  watcher: mockWatcher as any,
  script: 'some/script',
  argv: ['foo', 'bar'],
  gracefulTimeout: 100,
  processExit$,
  sigint$,
  sigterm$,
};

expect.addSnapshotSerializer(extendedEnvSerializer);

beforeEach(() => {
  jest.clearAllMocks();
  log.messages.length = 0;
  currentProc = undefined;
});

const subscriptions: Rx.Subscription[] = [];
const run = (server: DevServer) => {
  const subscription = server.run$.subscribe({
    error(e) {
      throw e;
    },
  });
  subscriptions.push(subscription);
  return subscription;
};

afterEach(() => {
  if (currentProc) {
    currentProc.removeAllListeners();
    currentProc = undefined;
  }

  for (const sub of subscriptions) {
    sub.unsubscribe();
  }
  subscriptions.length = 0;
});

describe('#run$', () => {
  it('starts the dev server with the right options', () => {
    run(new DevServer(defaultOptions)).unsubscribe();

    expect(execa.node.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "some/script",
          Array [
            "foo",
            "bar",
            "--logging.json=false",
          ],
          Object {
            "env": Object {
              "<inheritted process.env>": true,
              "ELASTIC_APM_SERVICE_NAME": "kibana",
              "isDevCliChild": "true",
            },
            "nodeOptions": Array [],
            "stdio": "pipe",
          },
        ],
      ]
    `);
  });

  it('writes stdout and stderr lines to logger', () => {
    run(new DevServer(defaultOptions));
    isProc(currentProc);

    currentProc.stdout.write('hello ');
    currentProc.stderr.write('something ');
    currentProc.stdout.write('world\n');
    currentProc.stderr.write('went wrong\n');
    expect(log.messages).toMatchInlineSnapshot(`
      Array [
        Object {
          "args": Array [
            "hello world",
          ],
          "type": "write",
        },
        Object {
          "args": Array [
            "something went wrong",
          ],
          "type": "write",
        },
      ]
    `);
  });

  it('is ready when message sends SERVER_LISTENING message', () => {
    const server = new DevServer(defaultOptions);
    run(server);
    isProc(currentProc);

    let ready;
    subscriptions.push(
      server.isReady$().subscribe((_ready) => {
        ready = _ready;
      })
    );

    expect(ready).toBe(false);
    currentProc.mockListening();
    expect(ready).toBe(true);
  });

  it('is not ready when process exits', () => {
    const server = new DevServer(defaultOptions);
    run(server);
    isProc(currentProc);

    const ready$ = new Rx.BehaviorSubject<undefined | boolean>(undefined);
    subscriptions.push(server.isReady$().subscribe(ready$));

    currentProc.mockListening();
    expect(ready$.getValue()).toBe(true);
    currentProc.mockExit(0);
    expect(ready$.getValue()).toBe(false);
  });

  it('logs about crashes when process exits with non-zero code', () => {
    const server = new DevServer(defaultOptions);
    run(server);
    isProc(currentProc);

    currentProc.mockExit(1);
    expect(log.messages).toMatchInlineSnapshot(`
      Array [
        Object {
          "args": Array [
            "server crashed",
            "with status code",
            1,
          ],
          "type": "bad",
        },
      ]
    `);
  });

  it('does not restart the server when process exits with 0 and stdio streams complete', async () => {
    const server = new DevServer(defaultOptions);
    run(server);
    isProc(currentProc);
    const initialProc = currentProc;

    const ready$ = new Rx.BehaviorSubject<undefined | boolean>(undefined);
    subscriptions.push(server.isReady$().subscribe(ready$));

    currentProc.mockExit(0);

    expect(ready$.getValue()).toBe(false);
    expect(initialProc).toBe(currentProc); // no restart or the proc would have been updated
  });

  it('kills server and restarts when watcher says to', () => {
    run(new DevServer(defaultOptions));

    const initialProc = currentProc;
    isProc(initialProc);

    restart$.next();
    expect(initialProc.signalsSent).toEqual(['SIGKILL']);

    isProc(currentProc);
    expect(currentProc).not.toBe(initialProc);
  });

  it('subscribes to sigint$, sigterm$, and processExit$ options', () => {
    run(new DevServer(defaultOptions));

    expect(sigint$.observers).toHaveLength(1);
    expect(sigterm$.observers).toHaveLength(1);
    expect(processExit$.observers).toHaveLength(1);
  });

  it('kills the server on sigint$ before listening', () => {
    run(new DevServer(defaultOptions));
    isProc(currentProc);

    expect(currentProc.signalsSent).toEqual([]);
    sigint$.next();
    expect(currentProc.signalsSent).toEqual(['SIGKILL']);
  });

  it('kills the server on processExit$', () => {
    run(new DevServer(defaultOptions));
    isProc(currentProc);

    expect(currentProc.signalsSent).toEqual([]);
    processExit$.next();
    expect(currentProc.signalsSent).toEqual(['SIGKILL']);
  });

  it('kills the server on sigterm$', () => {
    run(new DevServer(defaultOptions));
    isProc(currentProc);

    expect(currentProc.signalsSent).toEqual([]);
    sigterm$.next();
    expect(currentProc.signalsSent).toEqual(['SIGKILL']);
  });

  it('sends SIGINT to child process on sigint$ after listening', () => {
    run(new DevServer(defaultOptions));
    isProc(currentProc);

    currentProc.mockListening();

    expect(currentProc.signalsSent).toEqual([]);
    sigint$.next();
    expect(currentProc.signalsSent).toEqual(['SIGINT']);
  });

  it('sends SIGKILL to child process on double sigint$ after listening', () => {
    run(new DevServer(defaultOptions));
    isProc(currentProc);

    currentProc.mockListening();

    expect(currentProc.signalsSent).toEqual([]);
    sigint$.next();
    sigint$.next();
    expect(currentProc.signalsSent).toEqual(['SIGINT', 'SIGKILL']);
  });

  it('kills the server after sending SIGINT and gracefulTimeout is passed after listening', async () => {
    run(new DevServer(defaultOptions));
    isProc(currentProc);

    currentProc.mockListening();

    expect(currentProc.signalsSent).toEqual([]);
    sigint$.next();
    expect(currentProc.signalsSent).toEqual(['SIGINT']);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(currentProc.signalsSent).toEqual(['SIGINT', 'SIGKILL']);
  });
});
