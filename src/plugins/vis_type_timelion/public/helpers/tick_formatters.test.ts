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

import { tickFormatters } from './tick_formatters';

describe('Tick Formatters', function() {
  let formatters: any;

  beforeEach(function() {
    formatters = tickFormatters();
  });

  describe('Bits mode', function() {
    let bitFormatter: any;
    beforeEach(function() {
      bitFormatter = formatters.bits;
    });

    it('is a function', function() {
      expect(bitFormatter).toEqual(expect.any(Function));
    });

    it('formats with b/kb/mb/gb', function() {
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

  describe('Bits/s mode', function() {
    let bitsFormatter: any;
    beforeEach(function() {
      bitsFormatter = formatters['bits/s'];
    });

    it('is a function', function() {
      expect(bitsFormatter).toEqual(expect.any(Function));
    });

    it('formats with b/kb/mb/gb', function() {
      expect(bitsFormatter(7)).toEqual('7b/s');
      expect(bitsFormatter(4 * 1000)).toEqual('4kb/s');
      expect(bitsFormatter(4.1 * 1000 * 1000)).toEqual('4.1mb/s');
      expect(bitsFormatter(3 * 1000 * 1000 * 1000)).toEqual('3gb/s');
    });

    it('formats negative values with b/kb/mb/gb', function() {
      expect(bitsFormatter(-7)).toEqual('-7b/s');
      expect(bitsFormatter(-4 * 1000)).toEqual('-4kb/s');
      expect(bitsFormatter(-4.1 * 1000 * 1000)).toEqual('-4.1mb/s');
      expect(bitsFormatter(-3 * 1000 * 1000 * 1000)).toEqual('-3gb/s');
    });
  });

  describe('Bytes mode', function() {
    let byteFormatter: any;
    beforeEach(function() {
      byteFormatter = formatters.bytes;
    });

    it('is a function', function() {
      expect(byteFormatter).toEqual(expect.any(Function));
    });

    it('formats with B/KB/MB/GB', function() {
      expect(byteFormatter(10)).toEqual('10B');
      expect(byteFormatter(10 * 1024)).toEqual('10KB');
      expect(byteFormatter(10.2 * 1024 * 1024)).toEqual('10.2MB');
      expect(byteFormatter(3 * 1024 * 1024 * 1024)).toEqual('3GB');
    });

    it('formats negative values with B/KB/MB/GB', function() {
      expect(byteFormatter(-10)).toEqual('-10B');
      expect(byteFormatter(-10 * 1024)).toEqual('-10KB');
      expect(byteFormatter(-10.2 * 1024 * 1024)).toEqual('-10.2MB');
      expect(byteFormatter(-3 * 1024 * 1024 * 1024)).toEqual('-3GB');
    });
  });

  describe('Bytes/s mode', function() {
    let bytesFormatter: any;
    beforeEach(function() {
      bytesFormatter = formatters['bytes/s'];
    });

    it('is a function', function() {
      expect(bytesFormatter).toEqual(expect.any(Function));
    });

    it('formats with B/KB/MB/GB', function() {
      expect(bytesFormatter(10)).toEqual('10B/s');
      expect(bytesFormatter(10 * 1024)).toEqual('10KB/s');
      expect(bytesFormatter(10.2 * 1024 * 1024)).toEqual('10.2MB/s');
      expect(bytesFormatter(3 * 1024 * 1024 * 1024)).toEqual('3GB/s');
    });

    it('formats negative values with B/KB/MB/GB', function() {
      expect(bytesFormatter(-10)).toEqual('-10B/s');
      expect(bytesFormatter(-10 * 1024)).toEqual('-10KB/s');
      expect(bytesFormatter(-10.2 * 1024 * 1024)).toEqual('-10.2MB/s');
      expect(bytesFormatter(-3 * 1024 * 1024 * 1024)).toEqual('-3GB/s');
    });
  });

  describe('Currency mode', function() {
    let currencyFormatter: any;
    beforeEach(function() {
      currencyFormatter = formatters.currency;
    });

    it('is a function', function() {
      expect(currencyFormatter).toEqual(expect.any(Function));
    });

    it('formats with $ by default', function() {
      const axis = {
        options: {
          units: {},
        },
      };
      expect(currencyFormatter(10.2, axis)).toEqual('$10.20');
    });

    it('accepts currency in ISO 4217', function() {
      const axis = {
        options: {
          units: {
            prefix: 'CNY',
          },
        },
      };

      expect(currencyFormatter(10.2, axis)).toEqual('CN¥10.20');
    });
  });

  describe('Percent mode', function() {
    let percentFormatter: any;
    beforeEach(function() {
      percentFormatter = formatters.percent;
    });

    it('is a function', function() {
      expect(percentFormatter).toEqual(expect.any(Function));
    });

    it('formats with %', function() {
      const axis = {
        options: {
          units: {},
        },
      };
      expect(percentFormatter(0.1234, axis)).toEqual('12%');
    });

    it('formats with % with decimal precision', function() {
      const tickDecimals = 3;
      const tickDecimalShift = 2;
      const axis = {
        tickDecimals: tickDecimals + tickDecimalShift,
        options: {
          units: {
            tickDecimalsShift: tickDecimalShift,
          },
        },
      };
      expect(percentFormatter(0.12345, axis)).toEqual('12.345%');
    });
  });

  describe('Custom mode', function() {
    let customFormatter: any;
    beforeEach(function() {
      customFormatter = formatters.custom;
    });

    it('is a function', function() {
      expect(customFormatter).toEqual(expect.any(Function));
    });

    it('accepts prefix and suffix', function() {
      const axis = {
        options: {
          units: {
            prefix: 'prefix',
            suffix: 'suffix',
          },
        },
        tickDecimals: 1,
      };

      expect(customFormatter(10.2, axis)).toEqual('prefix10.2suffix');
    });

    it('correctly renders small values', function() {
      const axis = {
        options: {
          units: {
            prefix: 'prefix',
            suffix: 'suffix',
          },
        },
        tickDecimals: 3,
      };

      expect(customFormatter(0.00499999999999999, axis)).toEqual('prefix0.005suffix');
    });
  });
});
