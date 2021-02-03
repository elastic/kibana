/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { attemptToURIDecode } from './attempt_to_uri_decode';

// this function doesn't work for % with other special chars or sequence %25
// known issue https://github.com/elastic/kibana/issues/82440
test('decodes an encoded string', () => {
  const originalName = 'test;,/?:@&=+$#';
  const encodedName = encodeURIComponent(originalName);
  // react router v5 automatically decodes route match params
  const reactRouterDecoded = decodeURI(encodedName);

  expect(attemptToURIDecode(encodedName)).toBe(originalName);
  expect(attemptToURIDecode(reactRouterDecoded)).toBe(originalName);
});

test('ignores the error if a string is already decoded', () => {
  const originalName = 'test%';

  const encodedName = encodeURIComponent(originalName);
  // react router v5 automatically decodes route match params
  const reactRouterDecoded = decodeURI(encodedName);

  expect(attemptToURIDecode(encodedName)).toBe(originalName);
  expect(attemptToURIDecode(reactRouterDecoded)).toBe(originalName);
});

test('returns wrong decoded value for %25 sequence', () => {
  const originalName = 'test%25';

  const encodedName = encodeURIComponent(originalName);
  // react router v5 automatically decodes route match params
  const reactRouterDecoded = decodeURI(encodedName);

  expect(attemptToURIDecode(encodedName)).toBe(originalName);
  expect(attemptToURIDecode(reactRouterDecoded)).not.toBe(originalName);
});

test('returns wrong decoded value for % with other escaped characters', () => {
  const originalName = 'test%?#';

  const encodedName = encodeURIComponent(originalName);
  // react router v5 automatically decodes route match params
  const reactRouterDecoded = decodeURI(encodedName);

  expect(attemptToURIDecode(encodedName)).toBe(originalName);
  expect(attemptToURIDecode(reactRouterDecoded)).not.toBe(originalName);
});

test("doesn't convert undefined to a string", () => {
  expect(attemptToURIDecode(undefined)).toBeUndefined();
});
