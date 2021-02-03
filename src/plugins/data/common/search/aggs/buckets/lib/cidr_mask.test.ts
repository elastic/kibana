/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
