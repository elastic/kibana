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

import { NowProvider, NowProviderInternalContract } from './now_provider';

let mockDateFromUrl: undefined | Date;
let nowProvider: NowProviderInternalContract;

jest.mock('./lib', () => ({
  // @ts-ignore
  ...jest.requireActual('./lib'),
  getForceNowFromUrl: () => mockDateFromUrl,
}));

beforeEach(() => {
  nowProvider = new NowProvider();
});
afterEach(() => {
  mockDateFromUrl = undefined;
});

test('should return Date.now() by default', async () => {
  const now = Date.now();
  await new Promise((r) => setTimeout(r, 10));
  expect(nowProvider.get().getTime()).toBeGreaterThan(now);
});

test('should forceNow from URL', async () => {
  mockDateFromUrl = new Date('1999-01-01T00:00:00.000Z');
  nowProvider = new NowProvider();
  expect(nowProvider.get()).toEqual(mockDateFromUrl);
});

test('should forceNow from URL if custom now is set', async () => {
  mockDateFromUrl = new Date('1999-01-01T00:00:00.000Z');
  nowProvider = new NowProvider();
  nowProvider.set(new Date());
  expect(nowProvider.get()).toEqual(mockDateFromUrl);
});
