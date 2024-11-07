/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IpAddress } from './ip_address';

describe('IpAddress', () => {
  describe('constructor', () => {
    it.each`
      address
      ${''}
      ${'hello, world'}
      ${'256.0.0.0'}
      ${'-1.0.0.0'}
      ${Number.MAX_SAFE_INTEGER}
      ${'fffff::'}
      ${'ffff:0:0:0:0:0:0:0:0'}
    `('should throw an error on $address', ({ address }) => {
      expect(() => new IpAddress(address)).toThrowError();
    });

    it.each`
      address                                                   | expected
      ${'192.168.257'}                                          | ${'192.168.1.1'}
      ${2116932386}                                             | ${'126.45.211.34'}
      ${'126.45.211.34'}                                        | ${'126.45.211.34'}
      ${[126, 45, 211, 34]}                                     | ${'126.45.211.34'}
      ${'ffff:0:0:0:0:0:0:0'}                                   | ${'ffff::'}
      ${'ffff::'}                                               | ${'ffff::'}
      ${[0xff, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]} | ${'ffff::'}
    `('should parse $address', ({ address, expected }) => {
      expect(new IpAddress(address).toString()).toBe(expected);
    });
  });

  describe('toString()', () => {
    it.each`
      address                 | expected
      ${'0.000.00000.1'}      | ${'0.0.0.1'}
      ${'192.168.257'}        | ${'192.168.1.1'}
      ${'ffff:0:0:0:0:0:0:0'} | ${'ffff::'}
      ${'0:0:0:0:0:0:0:ffff'} | ${'::ffff'}
      ${'f:0:0:0:0:0:0:f'}    | ${'f::f'}
    `('should serialize $address as $expected', ({ address, expected }) => {
      expect(new IpAddress(address).toString()).toBe(expected);
    });
  });
});
