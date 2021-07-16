/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import * as Rx from 'rxjs';
import { toArray, take } from 'rxjs/operators';
import { lastValueFrom } from '@kbn/std';

import { ApmServerProcess } from './apm_server_process';

const record = <T>(obs: Rx.Observable<T>): { history: string[]; sub: Rx.Subscription } => {
  const history: string[] = [];
  const sub = obs.subscribe(
    (v) => history.push(v === undefined ? `next` : `next: ${inspect(v)}`),
    (e) => history.push(`error: ${e.stack.split('\n')[0]}`),
    () => history.push(`complete`)
  );
  return { history, sub };
};

const collect = async <T>(obs: Rx.Observable<T>): Promise<T[]> => {
  return await lastValueFrom(obs.pipe(toArray()));
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('#getReady$()', () => {
  it('does not produce a value until server is ready', async () => {
    const ready$ = new Rx.Subject<void>();
    const proc = new ApmServerProcess(Rx.NEVER, ready$, new Rx.Subject());

    const { history } = record(proc.isReady$().pipe(take(1)));

    // sleep for a sec to make sure it doesn't produce a value
    await sleep(10);
    expect(history).toHaveLength(0);

    ready$.next();
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next",
        "complete",
      ]
    `);

    proc.stop();
  });

  it('produces a value if server is already ready before subscription', async () => {
    const ready$ = new Rx.Subject<void>();
    const proc = new ApmServerProcess(Rx.NEVER, ready$, new Rx.Subject());
    ready$.next();

    const values = await collect(proc.isReady$().pipe(take(1)));
    expect(values).toMatchInlineSnapshot(`
      Array [
        undefined,
      ]
    `);

    proc.stop();
  });

  it('completes when the process is stopped', () => {
    const proc = new ApmServerProcess(Rx.NEVER, Rx.of(undefined), new Rx.Subject());
    const { history } = record(proc.isReady$());
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next",
      ]
    `);
    proc.stop();
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next",
        "complete",
      ]
    `);
  });
});

describe('#getState()', () => {
  it('returns starting state on subscription, ready when ready, and completes when stopped', () => {
    const ready$ = new Rx.Subject<void>();
    const proc = new ApmServerProcess(Rx.NEVER, ready$, new Rx.Subject());

    const { history } = record(proc.getState$());
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
      ]
    `);

    ready$.next();
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
        "next: { type: 'ready' }",
      ]
    `);

    proc.stop();
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
        "next: { type: 'ready' }",
        "complete",
      ]
    `);
  });

  it('errors if process encounters an error', () => {
    const error$ = new Rx.Subject<Error>();
    const proc = new ApmServerProcess(error$, Rx.NEVER, new Rx.Subject());

    const { history } = record(proc.getState$());
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
      ]
    `);

    error$.next(new Error('something went wrong'));
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
        "error: Error: something went wrong",
      ]
    `);

    proc.stop();
    expect(history).toMatchInlineSnapshot(`
      Array [
        "next: { type: 'starting' }",
        "error: Error: something went wrong",
      ]
    `);
  });
});
