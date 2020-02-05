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

import { CidrMask } from './cidr_mask';

describe('CidrMask', () => {
  test('should throw errors with invalid CIDR masks', () => {
    expect(
      () =>
        // @ts-ignore
        new CidrMask()
    ).toThrowError();

    expect(() => new CidrMask('')).toThrowError();
    expect(() => new CidrMask('hello, world')).toThrowError();
    expect(() => new CidrMask('0.0.0.0')).toThrowError();
    expect(() => new CidrMask('0.0.0.0/0')).toThrowError();
    expect(() => new CidrMask('0.0.0.0/33')).toThrowError();
    expect(() => new CidrMask('256.0.0.0/32')).toThrowError();
    expect(() => new CidrMask('0.0.0.0/32/32')).toThrowError();
    expect(() => new CidrMask('1.2.3/1')).toThrowError();
    expect(() => new CidrMask('0.0.0.0/123d')).toThrowError();
  });

  test('should correctly grab IP address and prefix length', () => {
    let mask = new CidrMask('0.0.0.0/1');
    expect(mask.initialAddress.toString()).toBe('0.0.0.0');
    expect(mask.prefixLength).toBe(1);

    mask = new CidrMask('128.0.0.1/31');
    expect(mask.initialAddress.toString()).toBe('128.0.0.1');
    expect(mask.prefixLength).toBe(31);
  });

  test('should calculate a range of IP addresses', () => {
    let mask = new CidrMask('0.0.0.0/1');
    let range = mask.getRange();
    expect(range.from.toString()).toBe('0.0.0.0');
    expect(range.to.toString()).toBe('127.255.255.255');

    mask = new CidrMask('1.2.3.4/2');
    range = mask.getRange();
    expect(range.from.toString()).toBe('0.0.0.0');
    expect(range.to.toString()).toBe('63.255.255.255');

    mask = new CidrMask('67.129.65.201/27');
    range = mask.getRange();
    expect(range.from.toString()).toBe('67.129.65.192');
    expect(range.to.toString()).toBe('67.129.65.223');
  });

  test('toString()', () => {
    let mask = new CidrMask('.../1');
    expect(mask.toString()).toBe('0.0.0.0/1');

    mask = new CidrMask('128.0.0.1/31');
    expect(mask.toString()).toBe('128.0.0.1/31');
  });
});
