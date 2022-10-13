/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseTimeoutToMs } from './parse_timeout_to_ms';

it('handles empty values', () => {
  expect(parseTimeoutToMs(undefined)).toMatchInlineSnapshot(`undefined`);
  expect(parseTimeoutToMs('')).toMatchInlineSnapshot(`undefined`);
});
it('returns numbers', () => {
  expect(parseTimeoutToMs(10)).toMatchInlineSnapshot(`10`);
});
it('parses seconds', () => {
  expect(parseTimeoutToMs('10')).toMatchInlineSnapshot(`10000`);
});
it('parses minutes', () => {
  expect(parseTimeoutToMs('10m')).toMatchInlineSnapshot(`600000`);
});
it('throws for invalid values', () => {
  expect(() => parseTimeoutToMs(true)).toThrowErrorMatchingInlineSnapshot(
    `"[true] is not a valid timeout value"`
  );
  expect(() => parseTimeoutToMs([true])).toThrowErrorMatchingInlineSnapshot(
    `"[[ true ]] is not a valid timeout value"`
  );
  expect(() => parseTimeoutToMs(['true'])).toThrowErrorMatchingInlineSnapshot(
    `"[[ 'true' ]] is not a valid timeout value"`
  );
  expect(() => parseTimeoutToMs(NaN)).toThrowErrorMatchingInlineSnapshot(
    `"[NaN] is not a valid timeout value"`
  );
});
