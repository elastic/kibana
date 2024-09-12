/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tickFormatters } from './tick_formatters';
import type { IAxis } from './panel_utils';

describe('Tick Formatters', () => {
  let formatters: any;

  beforeEach(function () {
    formatters = tickFormatters({} as IAxis);
  });

  describe('Bits mode', () => {
    let bitFormatter: any;
    beforeEach(function () {
      bitFormatter = formatters.bits;
    });

    it('is a function', () => {
      expect(bitFormatter).toEqual(expect.any(Function));
    });

    it('formats with b/kb/mb/gb', () => {
      expect(bitFormatter(7)).toEqual('7b');
      expect(bitFormatter(4 * 1000)).toEqual('4kb');
      expect(bitFormatter(4.1 * 1000 * 1000)).toEqual('4.1mb');
      expect(bitFormatter(3 * 1000 * 1000 * 1000)).toEqual('3gb');
    });

    it('formats negative values with b/kb/mb/gb', () => {
      expect(bitFormatter(-7)).toEqual('-7b');
      expect(bitFormatter(-4 * 1000)).toEqual('-4kb');
      expect(bitFormatter(-4.1 * 1000 * 1000)).toEqual('-4.1mb');
      expect(bitFormatter(-3 * 1000 * 1000 * 1000)).toEqual('-3gb');
    });
  });

  describe('Bits/s mode', () => {
    let bitsFormatter: any;
    beforeEach(function () {
      bitsFormatter = formatters['bits/s'];
    });

    it('is a function', () => {
      expect(bitsFormatter).toEqual(expect.any(Function));
    });

    it('formats with b/kb/mb/gb', () => {
      expect(bitsFormatter(7)).toEqual('7b/s');
      expect(bitsFormatter(4 * 1000)).toEqual('4kb/s');
      expect(bitsFormatter(4.1 * 1000 * 1000)).toEqual('4.1mb/s');
      expect(bitsFormatter(3 * 1000 * 1000 * 1000)).toEqual('3gb/s');
    });

    it('formats negative values with b/kb/mb/gb', () => {
      expect(bitsFormatter(-7)).toEqual('-7b/s');
      expect(bitsFormatter(-4 * 1000)).toEqual('-4kb/s');
      expect(bitsFormatter(-4.1 * 1000 * 1000)).toEqual('-4.1mb/s');
      expect(bitsFormatter(-3 * 1000 * 1000 * 1000)).toEqual('-3gb/s');
    });
  });

  describe('Bytes mode', () => {
    let byteFormatter: any;
    beforeEach(function () {
      byteFormatter = formatters.bytes;
    });

    it('is a function', () => {
      expect(byteFormatter).toEqual(expect.any(Function));
    });

    it('formats with B/KB/MB/GB', () => {
      expect(byteFormatter(10)).toEqual('10B');
      expect(byteFormatter(10 * 1024)).toEqual('10KB');
      expect(byteFormatter(10.2 * 1024 * 1024)).toEqual('10.2MB');
      expect(byteFormatter(3 * 1024 * 1024 * 1024)).toEqual('3GB');
    });

    it('formats negative values with B/KB/MB/GB', () => {
      expect(byteFormatter(-10)).toEqual('-10B');
      expect(byteFormatter(-10 * 1024)).toEqual('-10KB');
      expect(byteFormatter(-10.2 * 1024 * 1024)).toEqual('-10.2MB');
      expect(byteFormatter(-3 * 1024 * 1024 * 1024)).toEqual('-3GB');
    });
  });

  describe('Bytes/s mode', () => {
    let bytesFormatter: any;
    beforeEach(function () {
      bytesFormatter = formatters['bytes/s'];
    });

    it('is a function', () => {
      expect(bytesFormatter).toEqual(expect.any(Function));
    });

    it('formats with B/KB/MB/GB', () => {
      expect(bytesFormatter(10)).toEqual('10B/s');
      expect(bytesFormatter(10 * 1024)).toEqual('10KB/s');
      expect(bytesFormatter(10.2 * 1024 * 1024)).toEqual('10.2MB/s');
      expect(bytesFormatter(3 * 1024 * 1024 * 1024)).toEqual('3GB/s');
    });

    it('formats negative values with B/KB/MB/GB', () => {
      expect(bytesFormatter(-10)).toEqual('-10B/s');
      expect(bytesFormatter(-10 * 1024)).toEqual('-10KB/s');
      expect(bytesFormatter(-10.2 * 1024 * 1024)).toEqual('-10.2MB/s');
      expect(bytesFormatter(-3 * 1024 * 1024 * 1024)).toEqual('-3GB/s');
    });
  });

  describe('Currency mode', () => {
    let currencyFormatter: any;
    beforeEach(function () {
      currencyFormatter = formatters.currency;
    });

    it('is a function', () => {
      expect(currencyFormatter).toEqual(expect.any(Function));
    });

    it('formats with $ by default', () => {
      const axis = {
        units: {},
      };
      formatters = tickFormatters(axis as IAxis);
      currencyFormatter = formatters.currency;
      expect(currencyFormatter(10.2)).toEqual('$10.20');
    });

    it('accepts currency in ISO 4217', () => {
      const axis = {
        units: {
          prefix: 'CNY',
        },
      };
      formatters = tickFormatters(axis as IAxis);
      currencyFormatter = formatters.currency;
      expect(currencyFormatter(10.2)).toEqual('CN¥10.20');
    });
  });

  describe('Percent mode', () => {
    let percentFormatter: any;
    beforeEach(function () {
      percentFormatter = formatters.percent;
    });

    it('is a function', () => {
      expect(percentFormatter).toEqual(expect.any(Function));
    });

    it('formats with %', () => {
      const axis = {
        units: {},
      };
      formatters = tickFormatters(axis as IAxis);
      percentFormatter = formatters.percent;
      expect(percentFormatter(0.1234)).toEqual('12%');
    });

    it('formats with % with decimal precision', () => {
      const tickDecimals = 3;
      const tickDecimalShift = 2;
      const axis = {
        tickDecimals: tickDecimals + tickDecimalShift,
        units: {
          tickDecimalsShift: tickDecimalShift,
        },
      } as unknown;
      formatters = tickFormatters(axis as IAxis);
      percentFormatter = formatters.percent;
      expect(percentFormatter(0.12345)).toEqual('12.345%');
    });
  });

  describe('Custom mode', () => {
    let customFormatter: any;
    beforeEach(function () {
      customFormatter = formatters.custom;
    });

    it('is a function', () => {
      expect(customFormatter).toEqual(expect.any(Function));
    });

    it('accepts prefix and suffix', () => {
      const axis = {
        units: {
          prefix: 'prefix',
          suffix: 'suffix',
        },
        tickDecimals: 1,
      };
      formatters = tickFormatters(axis as IAxis);
      customFormatter = formatters.custom;
      expect(customFormatter(10.2)).toEqual('prefix10.2suffix');
    });

    it('correctly renders small values', () => {
      const axis = {
        units: {
          prefix: 'prefix',
          suffix: 'suffix',
        },
        tickDecimals: 3,
      };
      formatters = tickFormatters(axis as IAxis);
      customFormatter = formatters.custom;
      expect(customFormatter(0.00499999999999999)).toEqual('prefix0.005suffix');
    });
  });
});
