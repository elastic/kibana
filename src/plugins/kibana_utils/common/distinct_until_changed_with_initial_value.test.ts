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

import { Subject } from 'rxjs';
import { distinctUntilChangedWithInitialValue } from './distinct_until_changed_with_initial_value';
import { toArray } from 'rxjs/operators';
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
