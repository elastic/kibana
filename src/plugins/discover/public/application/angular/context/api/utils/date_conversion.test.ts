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
import { extractNanos } from './date_conversion';

describe('function extractNanos', function () {
  test('extract nanos of 2014-01-01', function () {
    expect(extractNanos('2014-01-01')).toBe('000000000');
  });
  test('extract nanos of 2014-01-01T12:12:12.234Z', function () {
    expect(extractNanos('2014-01-01T12:12:12.234Z')).toBe('234000000');
  });
  test('extract nanos of 2014-01-01T12:12:12.234123321Z', function () {
    expect(extractNanos('2014-01-01T12:12:12.234123321Z')).toBe('234123321');
  });
});
