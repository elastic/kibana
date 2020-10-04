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

import { tapOnce } from './tap_once';
import { from, Subject } from 'rxjs';

describe('tapOnce', () => {
  test('should convert a dot.notated.string into a short string', async (done) => {
    const tester = jest.fn();
    const nextTester = jest.fn();
    from([1, 2, 3, 4])
      .pipe(tapOnce(tester))
      .subscribe({
        next: (v) => {
          nextTester(v);
        },
        complete: () => {
          expect(nextTester).toBeCalledTimes(4);
          expect(tester).toBeCalledWith(1);
          done();
        },
      });
  });

  test('fires once even when there are multiple subscriptions', async (done) => {
    const tester = jest.fn();

    const source = from([1, 2, 3, 4]).pipe(tapOnce(tester));

    source.subscribe(() => {});
    source.subscribe({
      next: () => {},
      complete: () => {
        expect(tester).toBeCalledWith(1);
        expect(tester).toBeCalledTimes(1);
        done();
      },
    });
  });
});
