/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as Rx from 'rxjs';

import { firstValueFrom, lastValueFrom } from './rxjs_7';

// create an empty observable that completes with no notifications
// after a delay to ensure helpers aren't checking for the EMPTY constant
function empty() {
  return new Rx.Observable<never>((subscriber) => {
    setTimeout(() => {
      subscriber.complete();
    }, 0);
  });
}

describe('firstValueFrom()', () => {
  it('resolves to the first value from the observable', async () => {
    await expect(firstValueFrom(Rx.of(1, 2, 3))).resolves.toBe(1);
  });

  it('rejects if the observable is empty', async () => {
    await expect(firstValueFrom(empty())).rejects.toThrowErrorMatchingInlineSnapshot(
      `"no elements in sequence"`
    );
  });

  it('unsubscribes from a source observable that emits synchronously', async () => {
    const values = [1, 2, 3, 4];
    let unsubscribed = false;
    const source = new Rx.Observable<number>((subscriber) => {
      while (!subscriber.closed && values.length) {
        subscriber.next(values.shift()!);
      }
      unsubscribed = subscriber.closed;
      subscriber.complete();
    });

    await expect(firstValueFrom(source)).resolves.toMatchInlineSnapshot(`1`);
    if (!unsubscribed) {
      throw new Error('expected source to be unsubscribed');
    }
    expect(values).toEqual([2, 3, 4]);
  });

  it('unsubscribes from the source observable after first async notification', async () => {
    const values = [1, 2, 3, 4];
    let unsubscribed = false;
    const source = new Rx.Observable<number>((subscriber) => {
      setTimeout(() => {
        while (!subscriber.closed) {
          subscriber.next(values.shift()!);
        }
        unsubscribed = subscriber.closed;
      });
    });

    await expect(firstValueFrom(source)).resolves.toMatchInlineSnapshot(`1`);
    if (!unsubscribed) {
      throw new Error('expected source to be unsubscribed');
    }
    expect(values).toEqual([2, 3, 4]);
  });
});

describe('lastValueFrom()', () => {
  it('resolves to the last value from the observable', async () => {
    await expect(lastValueFrom(Rx.of(1, 2, 3))).resolves.toBe(3);
  });

  it('rejects if the observable is empty', async () => {
    await expect(lastValueFrom(empty())).rejects.toThrowErrorMatchingInlineSnapshot(
      `"no elements in sequence"`
    );
  });
});
