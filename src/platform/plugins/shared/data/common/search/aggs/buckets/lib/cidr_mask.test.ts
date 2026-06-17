/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CidrMask } from './cidr_mask';

describe('CidrMask', () => {
  describe('constructor', () => {
    it.each`
      mask
      ${''}
      ${'hello, world'}
      ${'0.0.0.0'}
      ${'0.0.0.0/33'}
      ${'256.0.0.0/32'}
      ${'0.0.0.0/32/32'}
      ${'0.0.0.0/123d'}
      ${'::1'}
      ${'::1/129'}
      ${'fffff::/128'}
      ${'ffff::/128/128'}
    `('should throw an error on $mask', ({ mask }) => {
      expect(() => new CidrMask(mask)).toThrowError();
    });
  });

  describe('toString', () => {
    it.each`
      mask                        | expected
      ${'192.168.1.1/24'}         | ${'192.168.1.1/24'}
      ${'192.168.257/32'}         | ${'192.168.1.1/32'}
      ${'ffff:0:0:0:0:0:0:0/128'} | ${'ffff::/128'}
    `('should format $mask as $expected', ({ mask, expected }) => {
      expect(new CidrMask(mask).toString()).toBe(expected);
    });
  });

  describe('getRange', () => {
    it.each`
      mask                  | from               | to
      ${'0.0.0.0/0'}        | ${'0.0.0.0'}       | ${'255.255.255.255'}
      ${'0.0.0.0/1'}        | ${'0.0.0.0'}       | ${'127.255.255.255'}
      ${'1.2.3.4/2'}        | ${'0.0.0.0'}       | ${'63.255.255.255'}
      ${'67.129.65.201/27'} | ${'67.129.65.192'} | ${'67.129.65.223'}
      ${'::/1'}             | ${'::'}            | ${'7fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'}
      ${'8000::/1'}         | ${'8000::'}        | ${'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff'}
    `('should return $from-$to for $mask', ({ mask, from, to }) => {
      expect(new CidrMask(mask).getRange()).toEqual({ from, to });
    });
  });
});
