/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
