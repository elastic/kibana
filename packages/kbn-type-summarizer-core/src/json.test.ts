/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseJson } from './json';

it('parses JSON', () => {
  expect(parseJson('{"foo": "bar"}')).toMatchInlineSnapshot(`
    Object {
      "foo": "bar",
    }
  `);
});

it('throws more helpful errors', () => {
  expect(() => parseJson('{"foo": bar}')).toThrowErrorMatchingInlineSnapshot(
    `"Failed to parse JSON: Unexpected token b in JSON at position 8"`
  );
});
