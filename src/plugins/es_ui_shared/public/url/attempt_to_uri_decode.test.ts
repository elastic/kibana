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
