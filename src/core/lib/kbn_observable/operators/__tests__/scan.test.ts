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

import { scan } from '../';
import { k$ } from '../../k';
import { collect } from '../../lib/collect';
import { Subject } from '../../subject';

test('completes when source completes', async () => {
  const subject = new Subject<string>();

  const observable = k$(subject)(
    scan((acc, val) => {
      return acc + val;
    }, 'foo')
  );
  const res = collect(observable);

  subject.next('bar');
  subject.next('baz');
  subject.complete();

  expect(await res).toEqual(['foobar', 'foobarbaz', 'C']);
});

test('injects index', async () => {
  const subject = new Subject<string>();

  const observable = k$(subject)(
    scan((acc, val, index) => {
      return acc + index;
    }, 'foo')
  );
  const res = collect(observable);

  subject.next('bar');
  subject.next('baz');
  subject.complete();

  expect(await res).toEqual(['foo0', 'foo01', 'C']);
});

test('completes if no values received', async () => {
  const subject = new Subject<string>();

  const observable = k$(subject)(
    scan((acc, val, index) => {
      return acc + val;
    }, 'foo')
  );
  const res = collect(observable);

  subject.complete();

  expect(await res).toEqual(['C']);
});
