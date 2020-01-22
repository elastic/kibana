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

import { IpFormat } from './ip';

describe('IP Address Format', () => {
  let ip: Record<string, any>;

  beforeEach(() => {
    ip = new IpFormat({}, jest.fn());
  });

  test('converts a value from a decimal to a string', () => {
    expect(ip.convert(1186489492)).toBe('70.184.100.148');
  });

  test('converts null and undefined to -', () => {
    expect(ip.convert(null)).toBe('-');
    expect(ip.convert(undefined)).toBe('-');
  });
});
