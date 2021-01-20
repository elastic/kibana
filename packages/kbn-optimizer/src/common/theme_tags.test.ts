/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { parseThemeTags } from './theme_tags';

it('returns default tags when passed undefined', () => {
  expect(parseThemeTags()).toMatchInlineSnapshot(`
    Array [
      "v7dark",
      "v7light",
    ]
  `);
});

it('returns all tags when passed *', () => {
  expect(parseThemeTags('*')).toMatchInlineSnapshot(`
    Array [
      "v7dark",
      "v7light",
      "v8dark",
      "v8light",
    ]
  `);
});

it('returns specific tag when passed a single value', () => {
  expect(parseThemeTags('v8light')).toMatchInlineSnapshot(`
    Array [
      "v8light",
    ]
  `);
});

it('returns specific tags when passed a comma separated list', () => {
  expect(parseThemeTags('v8light, v7dark,v7light')).toMatchInlineSnapshot(`
    Array [
      "v7dark",
      "v7light",
      "v8light",
    ]
  `);
});

it('returns specific tags when passed an array', () => {
  expect(parseThemeTags(['v8light', 'v7light'])).toMatchInlineSnapshot(`
    Array [
      "v7light",
      "v8light",
    ]
  `);
});

it('throws when an invalid tag is in the array', () => {
  expect(() => parseThemeTags(['v8light', 'v7light', 'bar'])).toThrowErrorMatchingInlineSnapshot(
    `"Invalid theme tags [bar], options: [v7dark, v7light, v8dark, v8light]"`
  );
});

it('throws when an invalid tags in comma separated list', () => {
  expect(() => parseThemeTags('v8light ,v7light,bar,box ')).toThrowErrorMatchingInlineSnapshot(
    `"Invalid theme tags [bar, box], options: [v7dark, v7light, v8dark, v8light]"`
  );
});

it('returns tags in alphabetical order', () => {
  const tags = parseThemeTags(['v7light', 'v8light']);
  expect(tags).toEqual(tags.slice().sort((a, b) => a.localeCompare(b)));
});

it('returns an immutable array', () => {
  expect(() => {
    const tags = parseThemeTags('v8light');
    // @ts-expect-error
    tags.push('foo');
  }).toThrowErrorMatchingInlineSnapshot(`"Cannot add property 1, object is not extensible"`);
});
