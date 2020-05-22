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

import { EventEmitter } from 'events';
import { inspect } from 'util';

import * as Rx from 'rxjs';
import { tap, takeUntil } from 'rxjs/operators';

import { observeParentOffline, Process } from './observe_parent_offline';
import { WorkerMsgs, ParentMsgs, isWorkerPing } from '../common';

jest.useFakeTimers();

beforeEach(() => {
  jest.clearAllTimers();
});

const workerMsgs = new WorkerMsgs();
const parentMsgs = new ParentMsgs();
class MockProcess extends EventEmitter implements Process {
  connected?: boolean;
  send?: jest.Mock;

  constructor(options: { connected?: boolean; send?: jest.Mock | false } = {}) {
    super();

    this.connected = options.connected ?? true;
    this.send = options.send === false ? undefined : options.send ?? jest.fn();
  }
}

async function record(observable: Rx.Observable<any>): Promise<string[]> {
  const notes: string[] = [];

  await observable
    .pipe(
      tap({
        next(value) {
          notes.push(`next: ${inspect(value)}`);
        },
        error(error) {
          notes.push(`error: ${inspect(error)}`);
        },
        complete() {
          notes.push(`complete`);
        },
      })
    )
    .toPromise();

  return notes;
}

async function waitForTick() {
  await new Promise(resolve => {
    process.nextTick(resolve);
  });
}

describe('emits and completes when parent exists because:', () => {
  test('"disconnect" event', async () => {
    const mockProc = new MockProcess();
    const promise = record(observeParentOffline(mockProc, workerMsgs));
    mockProc.emit('disconnect');
    expect(await promise).toMatchInlineSnapshot(`
      Array [
        "next: 'parent offline (disconnect event)'",
        "complete",
      ]
    `);
  });

  test('process.connected is false', async () => {
    const mockProc = new MockProcess({
      connected: false,
    });

    const promise = record(observeParentOffline(mockProc, workerMsgs));
    jest.advanceTimersToNextTimer();
    expect(await promise).toMatchInlineSnapshot(`
      Array [
        "next: 'parent offline (disconnected)'",
        "complete",
      ]
    `);
  });

  test('process.send is falsey', async () => {
    const mockProc = new MockProcess({
      send: false,
    });

    const promise = record(observeParentOffline(mockProc, workerMsgs));
    jest.advanceTimersToNextTimer();
    expect(await promise).toMatchInlineSnapshot(`
      Array [
        "next: 'parent offline (disconnected)'",
        "complete",
      ]
    `);
  });

  test('process.send throws "ERR_IPC_CHANNEL_CLOSED"', async () => {
    const mockProc = new MockProcess({
      send: jest.fn(() => {
        const error = new Error();
        (error as any).code = 'ERR_IPC_CHANNEL_CLOSED';
        throw error;
      }),
    });

    const promise = record(observeParentOffline(mockProc, workerMsgs));
    jest.advanceTimersToNextTimer();
    expect(await promise).toMatchInlineSnapshot(`
      Array [
        "next: 'parent offline (ipc channel exception)'",
        "complete",
      ]
    `);
  });

  test('ping timeout', async () => {
    const mockProc = new MockProcess({});

    const promise = record(observeParentOffline(mockProc, workerMsgs));
    jest.advanceTimersByTime(10000);
    expect(await promise).toMatchInlineSnapshot(`
      Array [
        "next: 'parent offline (ping timeout)'",
        "complete",
      ]
    `);
  });
});

test('it emits nothing if parent responds with pongs', async () => {
  const send = jest.fn((msg: any) => {
    if (isWorkerPing(msg)) {
      process.nextTick(() => {
        mockProc.emit('message', parentMsgs.pong(), undefined);
      });
    }
  });

  const mockProc = new MockProcess({ send });
  const unsub$ = new Rx.Subject();
  const promise = record(observeParentOffline(mockProc, workerMsgs).pipe(takeUntil(unsub$)));

  jest.advanceTimersByTime(5000);
  await waitForTick();
  jest.advanceTimersByTime(5000);
  await waitForTick();
  unsub$.next();

  expect(await promise).toMatchInlineSnapshot(`
    Array [
      "complete",
    ]
  `);
  expect(send).toHaveBeenCalledTimes(2);
});
