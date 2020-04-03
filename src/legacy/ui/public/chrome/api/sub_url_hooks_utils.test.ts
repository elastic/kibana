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

import { areHashesDifferentButDecodedHashesEquals } from './sub_url_hooks_utils';

test('false for different hashes', () => {
  const url1 = `https://localhost/kibana/#/dashboard/id`;
  const url2 = `https://localhost/kibana/#/dashboard/DIFFERENT`;
  expect(areHashesDifferentButDecodedHashesEquals(url1, url2)).toBeFalsy();
});

test('false for same hashes', () => {
  const hash = `/dashboard/id?_a=(filters:!(),query:(language:kuery,query:''))&_g=(filters:!(),time:(from:now-120m,to:now))`;
  const url1 = `https://localhost/kibana/#/${hash}`;
  expect(areHashesDifferentButDecodedHashesEquals(url1, url1)).toBeFalsy();
});

test('true for same hashes, but one is encoded', () => {
  const hash = `/dashboard/id?_a=(filters:!(),query:(language:kuery,query:''))&_g=(filters:!(),time:(from:now-120m,to:now))`;
  const url1 = `https://localhost/kibana/#/${hash}`;
  const url2 = `https://localhost/kibana/#/${encodeURIComponent(hash)}`;
  expect(areHashesDifferentButDecodedHashesEquals(url1, url2)).toBeTruthy();
});

/**
 * This edge case occurs when trying to navigate within kibana app using core's `navigateToApp` api
 * and there is reserved characters in hash (see: query:'' part)
 * For example:
 * ```ts
 * navigateToApp('kibana', {
 *    path: '#/dashboard/f8bc19f0-6918-11ea-9258-a74c2ded064d?_a=(filters:!(),query:(language:kuery,query:''))&_g=(filters:!(),time:(from:now-120m,to:now))'
 *  })
 * ```
 * Core internally is using url.parse which parses ' -> %27 and performs the navigation
 * Then angular decodes it back and causes redundant history record if not the fix which is covered by the test below
 */
test("true for same hashes, but one has reserved character (') encoded", () => {
  const hash = `/dashboard/id?_a=(filters:!(),query:(language:kuery,query:''))&_g=(filters:!(),time:(from:now-120m,to:now))`;
  const url1 = `https://localhost/kibana/#/${hash}`;
  const url2 = `https://localhost/kibana/#/${hash.replace(/\'/g, '%27')}`;
  expect(areHashesDifferentButDecodedHashesEquals(url1, url2)).toBeTruthy();
});
