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

import { getLastValue } from './get_last_value';

describe('getLastValue(data)', () => {
  test('should returns data if data is not array', () => {
    expect(getLastValue('foo')).toBe('foo');
  });

  test('should returns the last value', () => {
    expect(getLastValue([[1, 2]])).toBe(2);
  });

  test('should returns the default value ', () => {
    expect(getLastValue()).toBe(0);
  });

  test('should returns 0 if second to last is not defined (default)', () => {
    expect(getLastValue([[1, null], [2, null]])).toBe(0);
  });

  test('should allows to override the default value', () => {
    expect(getLastValue(null, '-')).toBe('-');
  });
});
