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

import { createCSPRuleString, DEFAULT_CSP_RULES, generateCSPNonce } from './';

// CSP rules aren't strictly additive, so any change can potentially expand or
// restrict the policy in a way we consider a breaking change. For that reason,
// we test the default rules exactly so any change to those rules gets flagged
// for manual review. In otherwords, this test is intentionally fragile to draw
// extra attention if defaults are modified in any way.
//
// A test failure here does not necessarily mean this change cannot be made,
// but any change here should undergo sufficient scrutiny by the Kibana
// security team.
//
// The tests use inline snapshots to make it as easy as possible to identify
// the nature of a change in defaults during a PR review.
test('default CSP rules', () => {
  expect(DEFAULT_CSP_RULES).toMatchInlineSnapshot(`
Array [
  "script-src 'unsafe-eval' 'nonce-{nonce}'",
  "worker-src blob:",
  "child-src blob:",
]
`);
});

test('generateCSPNonce() creates a 16 character string', async () => {
  const nonce = await generateCSPNonce();

  expect(nonce).toHaveLength(16);
});

test('generateCSPNonce() creates a new string on each call', async () => {
  const nonce1 = await generateCSPNonce();
  const nonce2 = await generateCSPNonce();

  expect(nonce1).not.toEqual(nonce2);
});

test('createCSPRuleString() converts an array of rules into a CSP header string', () => {
  const csp = createCSPRuleString([`string-src 'self'`, 'worker-src blob:', 'img-src data: blob:']);

  expect(csp).toMatchInlineSnapshot(`"string-src 'self'; worker-src blob:; img-src data: blob:"`);
});

test('createCSPRuleString() replaces all occurrences of {nonce} if provided', () => {
  const csp = createCSPRuleString(
    [`string-src 'self' 'nonce-{nonce}'`, 'img-src data: blob:', `default-src  'nonce-{nonce}'`],
    'foo'
  );

  expect(csp).toMatchInlineSnapshot(
    `"string-src 'self' 'nonce-foo'; img-src data: blob:; default-src  'nonce-foo'"`
  );
});
