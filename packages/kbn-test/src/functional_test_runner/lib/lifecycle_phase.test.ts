/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as Rx from 'rxjs';
import { materialize, toArray } from 'rxjs/operators';

import { LifecyclePhase } from './lifecycle_phase';

describe('with randomness', () => {
  beforeEach(() => {
    const randomOrder = [0, 0.75, 0.5, 0.25, 1];
    jest.spyOn(Math, 'random').mockImplementation(() => {
      const n = randomOrder.shift()!;
      randomOrder.push(n);
      return n;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls handlers in random order', async () => {
    const phase = new LifecyclePhase();
    const order: string[] = [];

    phase.add(
      jest.fn(() => {
        order.push('one');
      })
    );

    phase.add(
      jest.fn(() => {
        order.push('two');
      })
    );

    phase.add(
      jest.fn(() => {
        order.push('three');
      })
    );

    await phase.trigger();

    // `phase.trigger()` uses `Math.random` to sort the internal array of
    // handlers. But since the sorting algorithm used internally in
    // `Array.prototype.sort` is not spec'ed, it can change between Node.js
    // versions, and as a result the expected output below might not match if
    // you up/downgrade Node.js.
    expect(order).toMatchInlineSnapshot(`
      Array [
        "three",
        "two",
        "one",
      ]
    `);
  });
});

describe('without randomness', () => {
  beforeEach(() => jest.spyOn(Math, 'random').mockImplementation(() => 0));
  afterEach(() => jest.restoreAllMocks());

  it('calls all handlers and throws first error', async () => {
    const phase = new LifecyclePhase();
    const fn1 = jest.fn();
    phase.add(fn1);

    const fn2 = jest.fn(() => {
      throw new Error('foo');
    });
    phase.add(fn2);

    const fn3 = jest.fn();
    phase.add(fn3);

    await expect(phase.trigger()).rejects.toThrowErrorMatchingInlineSnapshot(`"foo"`);
    expect(fn1).toHaveBeenCalled();
    expect(fn2).toHaveBeenCalled();
    expect(fn3).toHaveBeenCalled();
  });

  it('triggers before$ just before calling handler and after$ once it resolves', async () => {
    const phase = new LifecyclePhase();
    const order: string[] = [];

    const beforeSub = jest.fn(() => order.push('before'));
    phase.before$.subscribe(beforeSub);

    const afterSub = jest.fn(() => order.push('after'));
    phase.after$.subscribe(afterSub);

    const handler = jest.fn(async () => {
      order.push('handler start');
      await new Promise((resolve) => setTimeout(resolve, 100));
      order.push('handler done');
    });
    phase.add(handler);

    await phase.trigger();
    expect(order).toMatchInlineSnapshot(`
      Array [
        "before",
        "handler start",
        "handler done",
        "after",
      ]
    `);
  });

  it('completes before$ and after$ if phase is singular', async () => {
    const phase = new LifecyclePhase({ singular: true });

    const beforeNotifs: Array<Rx.Notification<unknown>> = [];
    phase.before$.pipe(materialize()).subscribe((n) => beforeNotifs.push(n));

    const afterNotifs: Array<Rx.Notification<unknown>> = [];
    phase.after$.pipe(materialize()).subscribe((n) => afterNotifs.push(n));

    await phase.trigger();
    expect(beforeNotifs).toMatchInlineSnapshot(`
      Array [
        Notification {
          "error": undefined,
          "hasValue": true,
          "kind": "N",
          "value": undefined,
        },
        Notification {
          "error": undefined,
          "hasValue": false,
          "kind": "C",
          "value": undefined,
        },
      ]
    `);
    expect(afterNotifs).toMatchInlineSnapshot(`
      Array [
        Notification {
          "error": undefined,
          "hasValue": true,
          "kind": "N",
          "value": undefined,
        },
        Notification {
          "error": undefined,
          "hasValue": false,
          "kind": "C",
          "value": undefined,
        },
      ]
    `);
  });

  it('completes before$ subscribers after trigger of singular phase', async () => {
    const phase = new LifecyclePhase({ singular: true });
    await phase.trigger();

    await expect(phase.before$.pipe(materialize(), toArray()).toPromise()).resolves
      .toMatchInlineSnapshot(`
            Array [
              Notification {
                "error": undefined,
                "hasValue": false,
                "kind": "C",
                "value": undefined,
              },
            ]
          `);
  });

  it('replays after$ event subscribers after trigger of singular phase', async () => {
    const phase = new LifecyclePhase({ singular: true });
    await phase.trigger();

    await expect(phase.after$.pipe(materialize(), toArray()).toPromise()).resolves
      .toMatchInlineSnapshot(`
            Array [
              Notification {
                "error": undefined,
                "hasValue": true,
                "kind": "N",
                "value": undefined,
              },
              Notification {
                "error": undefined,
                "hasValue": false,
                "kind": "C",
                "value": undefined,
              },
            ]
          `);
  });
});
