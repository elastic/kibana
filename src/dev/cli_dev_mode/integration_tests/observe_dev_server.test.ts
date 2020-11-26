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
import Fs from 'fs';

import * as Rx from 'rxjs';
import { materialize, toArray, share } from 'rxjs/operators';
import del from 'del';
import { firstValueFrom } from '@kbn/std';

import { observeDevServer } from '../observe_dev_server';

expect.addSnapshotSerializer({
  test: (v) => typeof v === 'object' && v !== null && typeof v.kill === 'function',
  serialize: () => '<ChildProcess>',
});

const TMP_DIR = Path.resolve(__dirname, '__tmp__');
const subs: Rx.Subscription[] = [];

jest.spyOn(process, 'on');

beforeAll(async () => {
  await del(TMP_DIR);
  Fs.mkdirSync(TMP_DIR);
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  for (const sub of subs) {
    sub.unsubscribe();
  }
  subs.length = 0;
});

afterAll(async () => {
  await del(TMP_DIR);
});

it(`notifies when the process sends a message`, async () => {
  const msg = await firstValueFrom(
    observeDevServer({
      script: require.resolve('./__fixtures__/send_a_message.js'),
      argv: [],
      gracefulTimeout: 5000,
      restart$: Rx.EMPTY,
    })
  );

  expect(msg).toMatchInlineSnapshot(`
    Object {
      "msg": "HELLO WORLD",
      "proc": <ChildProcess>,
      "type": "msg",
    }
  `);
});

it(`kills the process when restart$ notifies and restarts it`, async () => {
  const notifications: Array<Rx.Notification<any>> = [];
  const each$ = new Rx.Subject<void>();
  const restart$ = new Rx.Subject<void>();

  subs.push(
    observeDevServer({
      script: require.resolve('./__fixtures__/restart_counter.js'),
      argv: [],
      gracefulTimeout: 5000,
      restart$,
    })
      .pipe(materialize())
      .subscribe((n) => {
        notifications.push(n);
        each$.next();
      })
  );

  await firstValueFrom(each$);
  expect(notifications.splice(0)).toMatchInlineSnapshot(`
    Array [
      Notification {
        "error": undefined,
        "hasValue": true,
        "kind": "N",
        "value": Object {
          "msg": "COUNTER_1",
          "proc": <ChildProcess>,
          "type": "msg",
        },
      },
    ]
  `);

  restart$.next();

  await firstValueFrom(each$);
  expect(notifications.splice(0)).toMatchInlineSnapshot(`
    Array [
      Notification {
        "error": undefined,
        "hasValue": true,
        "kind": "N",
        "value": Object {
          "msg": "COUNTER_2",
          "proc": <ChildProcess>,
          "type": "msg",
        },
      },
    ]
  `);

  restart$.next();

  await firstValueFrom(each$);
  expect(notifications.splice(0)).toMatchInlineSnapshot(`
    Array [
      Notification {
        "error": undefined,
        "hasValue": true,
        "kind": "N",
        "value": Object {
          "msg": "COUNTER_3",
          "proc": <ChildProcess>,
          "type": "msg",
        },
      },
    ]
  `);
});

it(`kills the process gracefully when SIGINT is received`, async () => {
  const sigint$ = new Rx.Subject();

  const state$ = new Rx.ReplaySubject();
  observeDevServer({
    script: require.resolve('./__fixtures__/timed_shutdown.js'),
    argv: ['0'],
    gracefulTimeout: 5000,
    restart$: Rx.EMPTY,
    sigint$,
  })
    .pipe(share())
    .subscribe(state$);

  // wait for "hello" before sending signal to make sure things are repeatable
  await firstValueFrom(state$);
  sigint$.next();

  const states = await firstValueFrom(state$.pipe(toArray()));
  expect(states).toMatchInlineSnapshot(`
    Array [
      Object {
        "msg": "HELLO",
        "proc": <ChildProcess>,
        "type": "msg",
      },
      Object {
        "msg": "EXITING",
        "proc": <ChildProcess>,
        "type": "msg",
      },
      Object {
        "code": 0,
        "signal": null,
        "type": "exitted",
      },
    ]
  `);
});

it(`kills the process gracefully when SIGINT is received before the process starts`, async () => {
  // send the signal as soon as the subscription happens, before the spawn has a chance to complete
  const sigint$ = Rx.of([undefined]);

  const state$ = new Rx.ReplaySubject();
  observeDevServer({
    script: require.resolve('./__fixtures__/timed_shutdown.js'),
    argv: ['0'],
    gracefulTimeout: 5000,
    restart$: Rx.EMPTY,
    sigint$,
  })
    .pipe(share())
    .subscribe(state$);

  const states = await firstValueFrom(state$.pipe(toArray()));
  expect(states).toMatchInlineSnapshot(`
    Array [
      Object {
        "code": 0,
        "signal": "SIGINT",
        "type": "exitted",
      },
    ]
  `);
});

it(`kills the process forcefully when the process doesn't shutdown gracefully after 5 seconds`, async () => {
  const sigint$ = new Rx.Subject();

  const state$ = new Rx.ReplaySubject();
  observeDevServer({
    script: require.resolve('./__fixtures__/timed_shutdown.js'),
    argv: ['30000'],
    gracefulTimeout: 5000,
    restart$: Rx.EMPTY,
    sigint$,
  })
    .pipe(share())
    .subscribe(state$);

  // wait for "hello" before sending signal to make sure things are repeatable
  await firstValueFrom(state$);
  sigint$.next();

  const states = await firstValueFrom(state$.pipe(toArray()));
  expect(states).toMatchInlineSnapshot(`
    Array [
      Object {
        "msg": "HELLO",
        "proc": <ChildProcess>,
        "type": "msg",
      },
      Object {
        "msg": "EXITING",
        "proc": <ChildProcess>,
        "type": "msg",
      },
      Object {
        "code": 0,
        "signal": "SIGKILL",
        "timedOutAfter": "SIGINT",
        "type": "exitted",
      },
    ]
  `);
});
