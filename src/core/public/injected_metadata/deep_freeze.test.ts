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

import { resolve } from 'path';

import execa from 'execa';

import { deepFreeze } from './deep_freeze';

it('returns the first argument with all original references', () => {
  const a = {};
  const b = {};
  const c = { a, b };

  const frozen = deepFreeze(c);
  expect(frozen).toBe(c);
  expect(frozen.a).toBe(a);
  expect(frozen.b).toBe(b);
});

it('prevents adding properties to argument', () => {
  const frozen = deepFreeze({});
  expect(() => {
    // @ts-ignore ts knows this shouldn't be possible, but just making sure
    frozen.foo = true;
  }).toThrowError(`object is not extensible`);
});

it('prevents changing properties on argument', () => {
  const frozen = deepFreeze({ foo: false });
  expect(() => {
    // @ts-ignore ts knows this shouldn't be possible, but just making sure
    frozen.foo = true;
  }).toThrowError(`read only property 'foo'`);
});

it('prevents changing properties on nested children of argument', () => {
  const frozen = deepFreeze({ foo: { bar: { baz: { box: 1 } } } });
  expect(() => {
    // @ts-ignore ts knows this shouldn't be possible, but just making sure
    frozen.foo.bar.baz.box = 2;
  }).toThrowError(`read only property 'box'`);
});

it('prevents adding items to a frozen array', () => {
  const frozen = deepFreeze({ foo: [1] });
  expect(() => {
    // @ts-ignore ts knows this shouldn't be possible, but just making sure
    frozen.foo.push(2);
  }).toThrowError(`object is not extensible`);
});

it('prevents reassigning items in a frozen array', () => {
  const frozen = deepFreeze({ foo: [1] });
  expect(() => {
    // @ts-ignore ts knows this shouldn't be possible, but just making sure
    frozen.foo[0] = 2;
  }).toThrowError(`read only property '0'`);
});

it('types return values to prevent mutations in typescript', async () => {
  await expect(
    execa.stdout('tsc', ['--noEmit'], {
      cwd: resolve(__dirname, '__fixtures__/frozen_object_mutation'),
    })
  ).rejects.toThrowErrorMatchingInlineSnapshot(`
"Command failed: tsc --noEmit

index.ts(30,11): error TS2540: Cannot assign to 'baz' because it is a constant or a read-only property.
index.ts(40,10): error TS2540: Cannot assign to 'bar' because it is a constant or a read-only property.
index.ts(42,1): error TS2542: Index signature in type 'RecursiveReadonlyArray<number>' only permits reading.
index.ts(50,8): error TS2339: Property 'push' does not exist on type 'RecursiveReadonlyArray<number>'.
"
`);
});
