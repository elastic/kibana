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

import { filterById, HasId } from './filter_by_id';

const bundles: HasId[] = [
  { id: 'foo' },
  { id: 'bar' },
  { id: 'abc' },
  { id: 'abcd' },
  { id: 'abcde' },
  { id: 'example_a' },
];

const print = (result: HasId[]) =>
  result
    .map((b) => b.id)
    .sort((a, b) => a.localeCompare(b))
    .join(', ');

it('[] matches everything', () => {
  expect(print(filterById([], bundles))).toMatchInlineSnapshot(
    `"abc, abcd, abcde, bar, example_a, foo"`
  );
});

it('* matches everything', () => {
  expect(print(filterById(['*'], bundles))).toMatchInlineSnapshot(
    `"abc, abcd, abcde, bar, example_a, foo"`
  );
});

it('combines mutliple filters to select any bundle which is matched', () => {
  expect(print(filterById(['foo', 'bar'], bundles))).toMatchInlineSnapshot(`"bar, foo"`);
  expect(print(filterById(['bar', 'abc*'], bundles))).toMatchInlineSnapshot(
    `"abc, abcd, abcde, bar"`
  );
});

it('matches everything if any filter is *', () => {
  expect(print(filterById(['*', '!abc*'], bundles))).toMatchInlineSnapshot(
    `"abc, abcd, abcde, bar, example_a, foo"`
  );
});

it('only matches bundles which are matched by an entire single filter', () => {
  expect(print(filterById(['*,!abc*'], bundles))).toMatchInlineSnapshot(`"bar, example_a, foo"`);
});

it('handles purely positive filters', () => {
  expect(print(filterById(['abc*'], bundles))).toMatchInlineSnapshot(`"abc, abcd, abcde"`);
});

it('handles purely negative filters', () => {
  expect(print(filterById(['!abc*'], bundles))).toMatchInlineSnapshot(`"bar, example_a, foo"`);
});
