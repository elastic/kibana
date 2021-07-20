/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import * as Rx from 'rxjs';

import { ExecState } from './apm_server_installation';
import { ApmServerProcess } from './apm_server_process';

class MockState extends Rx.BehaviorSubject<ExecState> {
  constructor() {
    super({ type: 'starting' });
  }

  mockReady() {
    this.next({ type: 'ready' });
  }

  mockError() {
    this.next({ type: 'error', error: new Error('mocked error') });
    this.complete();
  }

  mockKilled() {
    this.next({ type: 'killed', signal: 'MOCKED' });
    this.complete();
  }

  mockExitted(code: number = 0) {
    this.next({ type: 'exitted', exitCode: code });
    this.complete();
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const record = (obs: Rx.Observable<ExecState>): { history: string[]; sub: Rx.Subscription } => {
  const history: string[] = [];
  const sub = obs.subscribe(
    (v) => {
      if (v.type === 'error') {
        history.push(`next: { type: 'error', error: ${v.error.message} }`);
      } else {
        history.push(`next: ${inspect(v)}`);
      }
    },
    (e) => history.push(`error: ${e.stack.split('\n')[0]}`),
    () => history.push(`complete`)
  );
  return { history, sub };
};

describe('#getCurrentState()', () => {
  it('returns current value of State behavior subject', () => {
    const state$ = new MockState();
    const proc = new ApmServerProcess(state$, new Rx.Subject());

    expect(proc.getCurrentState()).toMatchInlineSnapshot(`
      Object {
        "type": "starting",
      }
    `);

    state$.mockReady();
    expect(proc.getCurrentState()).toMatchInlineSnapshot(`
      Object {
        "type": "ready",
      }
    `);

    state$.mockExitted();
    expect(proc.getCurrentState()).toMatchInlineSnapshot(`
      Object {
        "exitCode": 0,
        "type": "exitted",
      }
    `);
  });
});

describe('#getState()', () => {
  it('returns starting state on subscription, ready when ready, and completes process is killed', () => {
    const state$ = new MockState();
    const proc = new ApmServerProcess(state$, new Rx.Subject());

    const { history } = record(proc.getState$());
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
      ]
    `);

    state$.mockReady();
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
        "next: { type: 'ready' }",
      ]
    `);

    state$.mockKilled();
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
        "next: { type: 'ready' }",
        "next: { type: 'killed', signal: 'MOCKED' }",
        "complete",
      ]
    `);
  });

  it('produces error state', () => {
    const state$ = new MockState();
    const proc = new ApmServerProcess(state$, new Rx.Subject());

    const { history } = record(proc.getState$());
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
      ]
    `);

    state$.mockError();
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
        "next: { type: 'error', error: mocked error }",
        "complete",
      ]
    `);
  });

  it('completes after "killed" when calling stop', async () => {
    const state$ = new MockState();
    const proc = new ApmServerProcess(state$, new Rx.Subject());

    const { history } = record(proc.getState$());
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
      ]
    `);

    proc.stop();
    await sleep(10);
    state$.mockKilled();

    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
        "next: { type: 'killed', signal: 'MOCKED' }",
        "complete",
      ]
    `);
  });
});

describe('#toPromise()', () => {
  it('resolves when the process exists as intended and stops observing state', async () => {
    const state$ = new MockState();
    const proc = new ApmServerProcess(state$, new Rx.Subject());
    state$.mockKilled();
    await expect(proc.toPromise()).resolves.toMatchInlineSnapshot(`undefined`);
    expect(state$.observers).toHaveLength(0);
  });

  it('rejects when the process exits with 0 and stops observing state', async () => {
    const state$ = new MockState();
    const proc = new ApmServerProcess(state$, new Rx.Subject());
    state$.mockExitted(0);
    await expect(proc.toPromise()).rejects.toMatchInlineSnapshot(
      `[Error: apm-server unexpectedly exitted with code [0]]`
    );
    expect(state$.observers).toHaveLength(0);
  });

  it('rejects when the process exits with 1 and stops observing state', async () => {
    const state$ = new MockState();
    const proc = new ApmServerProcess(state$, new Rx.Subject());
    state$.mockExitted(1);
    await expect(proc.toPromise()).rejects.toMatchInlineSnapshot(
      `[Error: apm-server unexpectedly exitted with code [1]]`
    );
    expect(state$.observers).toHaveLength(0);
  });

  it('rejects when the process throws an error and stops observing state', async () => {
    const state$ = new MockState();
    const proc = new ApmServerProcess(state$, new Rx.Subject());
    state$.mockError();
    await expect(proc.toPromise()).rejects.toMatchInlineSnapshot(`[Error: mocked error]`);
    expect(state$.observers).toHaveLength(0);
  });

  it('resolves with the killed state after calling stop', async () => {
    const state$ = new MockState();
    const proc = new ApmServerProcess(state$, new Rx.Subject());
    const promise = proc.toPromise();
    proc.stop();
    await sleep(10);
    state$.mockKilled();
    await expect(promise).resolves.toMatchInlineSnapshot(`undefined`);
    expect(state$.observers).toHaveLength(0);
  });
});
