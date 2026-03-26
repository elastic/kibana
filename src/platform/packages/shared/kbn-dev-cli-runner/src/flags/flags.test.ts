/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFlags } from './flags';

it('gets flags correctly', () => {
  expect(
    getFlags(['-a', '--abc=bcd', '--foo=bar', '--no-bar', '--foo=baz', '--box', 'yes', '-zxy'], {
      boolean: ['x'],
      string: ['abc'],
      alias: {
        x: 'extra',
      },
      allowUnexpected: true,
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
      allowUnexpected: true,
      guessTypesForUnexpectedFlags: true,
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
