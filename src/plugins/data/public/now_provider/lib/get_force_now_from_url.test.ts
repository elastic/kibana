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

import { getForceNowFromUrl } from './get_force_now_from_url';
const originalLocation = window.location;
afterAll(() => {
  window.location = originalLocation;
});

function mockLocation(url: string) {
  // @ts-ignore
  delete window.location;
  // @ts-ignore
  window.location = new URL(url);
}

test('should get force now from URL', () => {
  const dateString = '1999-01-01T00:00:00.000Z';
  mockLocation(`https://elastic.co/?forceNow=${dateString}`);

  expect(getForceNowFromUrl()).toEqual(new Date(dateString));
});

test('should throw if force now is invalid', () => {
  const dateString = 'invalid-date';
  mockLocation(`https://elastic.co/?forceNow=${dateString}`);

  expect(() => getForceNowFromUrl()).toThrowError();
});

test('should return undefined if no forceNow', () => {
  mockLocation(`https://elastic.co/`);
  expect(getForceNowFromUrl()).toBe(undefined);
});
