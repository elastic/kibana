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
