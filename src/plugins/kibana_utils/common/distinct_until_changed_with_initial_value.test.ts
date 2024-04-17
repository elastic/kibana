/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import { distinctUntilChangedWithInitialValue } from './distinct_until_changed_with_initial_value';
import { toArray } from 'rxjs';
import deepEqual from 'fast-deep-equal';

describe('distinctUntilChangedWithInitialValue', () => {
  it('should skip updates with the same value', async () => {
    const subject = new Subject<number>();
    const result = subject.pipe(distinctUntilChangedWithInitialValue(1), toArray()).toPromise();

    subject.next(2);
    subject.next(3);
    subject.next(3);
    subject.next(3);
    subject.complete();

    expect(await result).toEqual([2, 3]);
  });

  it('should accept promise as initial value', async () => {
    const subject = new Subject<number>();
    const result = subject
      .pipe(
        distinctUntilChangedWithInitialValue(
          new Promise((resolve) => {
            resolve(1);
            setTimeout(() => {
              subject.next(2);
              subject.next(3);
              subject.next(3);
              subject.next(3);
              subject.complete();
            });
          })
        ),
        toArray()
      )
      .toPromise();
    expect(await result).toEqual([2, 3]);
  });

  it('should accept custom comparator', async () => {
    const subject = new Subject<any>();
    const result = subject
      .pipe(distinctUntilChangedWithInitialValue({ test: 1 }, deepEqual), toArray())
      .toPromise();

    subject.next({ test: 1 });
    subject.next({ test: 2 });
    subject.next({ test: 2 });
    subject.next({ test: 3 });
    subject.complete();

    expect(await result).toEqual([{ test: 2 }, { test: 3 }]);
  });
});
