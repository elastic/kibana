/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asDecimal, asInteger, asDecimalOrInteger } from './numeric';

describe('formatters', () => {
  describe('asDecimal', () => {
    it.each([
      [Infinity, 'N/A'],
      [-Infinity, 'N/A'],
      [null, 'N/A'],
      [undefined, 'N/A'],
      [NaN, 'N/A'],
    ])(
      'displays the not available label when the number is not finite',
      (value, formattedValue) => {
        expect(asDecimal(value)).toBe(formattedValue);
      }
    );

    it.each([
      [0, '0.0'],
      [0.005, '0.0'],
      [1.23, '1.2'],
      [12.34, '12.3'],
      [123.45, '123.5'],
      [1234.56, '1,234.6'],
      [1234567.89, '1,234,567.9'],
    ])('displays the correct label when the number is finite', (value, formattedValue) => {
      expect(asDecimal(value)).toBe(formattedValue);
    });
  });

  describe('asInteger', () => {
    it.each([
      [Infinity, 'N/A'],
      [-Infinity, 'N/A'],
      [null, 'N/A'],
      [undefined, 'N/A'],
      [NaN, 'N/A'],
    ])(
      'displays the not available label when the number is not finite',
      (value, formattedValue) => {
        expect(asInteger(value)).toBe(formattedValue);
      }
    );

    it.each([
      [0, '0'],
      [0.005, '0'],
      [1.23, '1'],
      [12.34, '12'],
      [123.45, '123'],
      [1234.56, '1,235'],
      [1234567.89, '1,234,568'],
    ])('displays the correct label when the number is finite', (value, formattedValue) => {
      expect(asInteger(value)).toBe(formattedValue);
    });
  });

  describe('asDecimalOrInteger', () => {
    it('formats as integer when number equals to 0 ', () => {
      expect(asDecimalOrInteger(0)).toEqual('0');
    });

    it('formats as integer when number is above or equals 10 ', () => {
      expect(asDecimalOrInteger(10.123)).toEqual('10');
      expect(asDecimalOrInteger(15.123)).toEqual('15');
    });

    it.each([
      [0.25435632645, '0.3'],
      [1, '1.0'],
      [3.374329704990765, '3.4'],
      [5, '5.0'],
      [9, '9.0'],
    ])('formats as decimal when number is below 10 ', (value, formattedValue) => {
      expect(asDecimalOrInteger(value)).toBe(formattedValue);
    });

    it.each([
      [-0.123, '-0.1'],
      [-1.234, '-1.2'],
      [-9.876, '-9.9'],
    ])(
      'formats as decimal when number is negative and below 10 in absolute value',
      (value, formattedValue) => {
        expect(asDecimalOrInteger(value)).toEqual(formattedValue);
      }
    );

    it.each([
      [-12.34, '-12'],
      [-123.45, '-123'],
      [-1234.56, '-1,235'],
      [-12345.67, '-12,346'],
      [-12345678.9, '-12,345,679'],
    ])(
      'formats as integer when number is negative and above or equals 10 in absolute value',
      (value, formattedValue) => {
        expect(asDecimalOrInteger(value)).toEqual(formattedValue);
      }
    );
  });
});
