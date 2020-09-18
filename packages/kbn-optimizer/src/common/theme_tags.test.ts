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
