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

import formatNumber from './format_number';

describe('format byte', () => {
  test('zero', () => {
    expect(formatNumber(0, 'byte')).toEqual('0.00 B');
  });

  test('mb', () => {
    expect(formatNumber(181142512, 'byte')).toEqual('181.14 MB');
  });

  test('gb', () => {
    expect(formatNumber(273727485000, 'byte')).toEqual('273.73 GB');
  });
});

describe('format ms', () => {
  test('zero', () => {
    expect(formatNumber(0, 'ms')).toEqual('0.00 ms');
  });

  test('sub ms', () => {
    expect(formatNumber(0.128, 'ms')).toEqual('0.13 ms');
  });

  test('many ms', () => {
    expect(formatNumber(3030.284, 'ms')).toEqual('3030.28 ms');
  });
});

describe('format integer', () => {
  test('zero', () => {
    expect(formatNumber(0, 'integer')).toEqual('0');
  });

  test('sub integer', () => {
    expect(formatNumber(0.728, 'integer')).toEqual('1');
  });

  test('many integer', () => {
    expect(formatNumber(3030.284, 'integer')).toEqual('3030');
  });
});
