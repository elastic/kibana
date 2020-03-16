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

import { leastCommonInterval } from './least_common_interval';

describe('leastCommonInterval', () => {
  it('should correctly return lowest common interval for fixed units', () => {
    expect(leastCommonInterval('1ms', '1s')).toBe('1s');
    expect(leastCommonInterval('500ms', '1s')).toBe('1s');
    expect(leastCommonInterval('1000ms', '1s')).toBe('1s');
    expect(leastCommonInterval('1500ms', '1s')).toBe('3s');
    expect(leastCommonInterval('1234ms', '1s')).toBe('617s');
    expect(leastCommonInterval('1s', '2m')).toBe('2m');
    expect(leastCommonInterval('300s', '2m')).toBe('10m');
    expect(leastCommonInterval('1234ms', '7m')).toBe('4319m');
    expect(leastCommonInterval('45m', '2h')).toBe('6h');
    expect(leastCommonInterval('12h', '4d')).toBe('4d');
    expect(leastCommonInterval('  20 h', '7d')).toBe('35d');
  });

  it('should correctly return lowest common interval for calendar units', () => {
    expect(leastCommonInterval('1m', '1h')).toBe('1h');
    expect(leastCommonInterval('1h', '1d')).toBe('1d');
    expect(leastCommonInterval('1d', '1w')).toBe('1w');
    expect(leastCommonInterval('1w', '1M')).toBe('1M');
    expect(leastCommonInterval('1M', '1y')).toBe('1y');
    expect(leastCommonInterval('1M', '1m')).toBe('1M');
    expect(leastCommonInterval('1y', '1w')).toBe('1y');
  });

  it('should throw an error for intervals of different types', () => {
    expect(() => {
      leastCommonInterval('60 s', '1m');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('1m', '2m');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('1h', '2h');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('1d', '7d');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('1h', '3d');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('7d', '1w');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('1M', '1000ms');
    }).toThrowError();
  });

  it('should throw an error for invalid intervals', () => {
    expect(() => {
      leastCommonInterval('foo', 'bar');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('0h', '1h');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('0.5h', '1h');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('5w', '1h');
    }).toThrowError();
    expect(() => {
      leastCommonInterval('2M', '4w');
    }).toThrowError();
  });
});
