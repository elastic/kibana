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

import { getFlags } from './flags';

it('gets flags correctly', () => {
  expect(
    getFlags(['-a', '--abc=bcd', '--foo=bar', '--no-bar', '--foo=baz', '--box', 'yes', '-zxy'], {
      flags: {
        boolean: ['x'],
        string: ['abc'],
        alias: {
          x: 'extra',
        },
        allowUnexpected: true,
      },
    })
  ).toMatchInlineSnapshot(`
    Object {
      "_": Array [],
      "abc": "bcd",
      "debug": false,
      "extra": true,
      "help": false,
      "quiet": false,
      "silent": false,
      "unexpected": Array [
        "-a",
        "--foo=bar",
        "--foo=baz",
        "--no-bar",
        "--box",
        "yes",
        "-z",
        "-y",
      ],
      "v": false,
      "verbose": false,
      "x": true,
    }
  `);
});

it('guesses types for unexpected flags', () => {
  expect(
    getFlags(['-abc', '--abc=bcd', '--no-foo', '--bar'], {
      flags: {
        allowUnexpected: true,
        guessTypesForUnexpectedFlags: true,
      },
    })
  ).toMatchInlineSnapshot(`
    Object {
      "_": Array [],
      "a": true,
      "abc": "bcd",
      "b": true,
      "bar": true,
      "c": true,
      "debug": false,
      "foo": false,
      "help": false,
      "quiet": false,
      "silent": false,
      "unexpected": Array [
        "-a",
        "-b",
        "-c",
        "-abc",
        "--abc=bcd",
        "--no-foo",
        "--bar",
      ],
      "v": false,
      "verbose": false,
    }
  `);
});
