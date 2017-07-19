import expect from 'expect.js';
import ngMock from 'ng_mock';
describe('Tick Formatters', function () {

  let tickFormatters;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    tickFormatters = Private(require('plugins/timelion/services/tick_formatters'));
  }));

  describe('Bits mode', function () {
    let bitFormatter;
    beforeEach(function () {
      bitFormatter = tickFormatters.bits;
    });

    it('is a function', function () {
      expect(bitFormatter).to.be.a('function');
    });

    it('formats with b/kb/mb/gb', function () {
      expect(bitFormatter(7)).to.equal('7b');
      expect(bitFormatter(4 * 1000)).to.equal('4kb');
      expect(bitFormatter(4.1 * 1000 * 1000)).to.equal('4.1mb');
      expect(bitFormatter(3 * 1000 * 1000 * 1000)).to.equal('3gb');
    });
  });

  describe('Bits/s mode', function () {
    let bitsFormatter;
    beforeEach(function () {
      bitsFormatter = tickFormatters['bits/s'];
    });

    it('is a function', function () {
      expect(bitsFormatter).to.be.a('function');
    });

    it('formats with b/kb/mb/gb', function () {
      expect(bitsFormatter(7)).to.equal('7b/s');
      expect(bitsFormatter(4 * 1000)).to.equal('4kb/s');
      expect(bitsFormatter(4.1 * 1000 * 1000)).to.equal('4.1mb/s');
      expect(bitsFormatter(3 * 1000 * 1000 * 1000)).to.equal('3gb/s');
    });
  });

  describe('Bytes mode', function () {
    let byteFormatter;
    beforeEach(function () {
      byteFormatter = tickFormatters.bytes;
    });

    it('is a function', function () {
      expect(byteFormatter).to.be.a('function');
    });

    it('formats with B/KB/MB/GB', function () {
      expect(byteFormatter(10)).to.equal('10B');
      expect(byteFormatter(10 * 1024)).to.equal('10KB');
      expect(byteFormatter(10.2 * 1024 * 1024)).to.equal('10.2MB');
      expect(byteFormatter(3 * 1024 * 1024 * 1024)).to.equal('3GB');
    });
  });

  describe('Bytes/s mode', function () {
    let bytesFormatter;
    beforeEach(function () {
      bytesFormatter = tickFormatters['bytes/s'];
    });

    it('is a function', function () {
      expect(bytesFormatter).to.be.a('function');
    });

    it('formats with B/KB/MB/GB', function () {
      expect(bytesFormatter(10)).to.equal('10B/s');
      expect(bytesFormatter(10 * 1024)).to.equal('10KB/s');
      expect(bytesFormatter(10.2 * 1024 * 1024)).to.equal('10.2MB/s');
      expect(bytesFormatter(3 * 1024 * 1024 * 1024)).to.equal('3GB/s');
    });
  });

  describe('Currency mode', function () {
    let currencyFormatter;
    beforeEach(function () {
      currencyFormatter = tickFormatters.currency;
    });

    it('is a function', function () {
      expect(currencyFormatter).to.be.a('function');
    });

    it('formats with $ by default', function () {
      const axis = {
        options: {
          units: {}
        }
      };
      expect(currencyFormatter(10.2, axis)).to.equal('$10.20');
    });

    it('accepts currency in ISO 4217', function () {
      const axis = {
        options: {
          units: {
            prefix: 'CNY'
          }
        }
      };

      expect(currencyFormatter(10.2, axis)).to.equal('CN¥10.20');
    });
  });

  describe('Percent mode', function () {
    let percentFormatter;
    beforeEach(function () {
      percentFormatter = tickFormatters.percent;
    });

    it('is a function', function () {
      expect(percentFormatter).to.be.a('function');
    });

    it('formats with %', function () {
      const axis = {
        options: {
          units: {}
        }
      };
      expect(percentFormatter(0.1234, axis)).to.equal('12.34%');
    });
  });

  describe('Custom mode', function () {
    let customFormatter;
    beforeEach(function () {
      customFormatter = tickFormatters.custom;
    });

    it('is a function', function () {
      expect(customFormatter).to.be.a('function');
    });

    it('accepts prefix and suffix', function () {
      const axis = {
        options: {
          units: {
            prefix: 'prefix',
            suffix: 'suffix'
          }
        },
        tickDecimals: 1
      };

      expect(customFormatter(10.2, axis)).to.equal('prefix10.2suffix');
    });

    it('correctly renders small values', function () {
      const axis = {
        options: {
          units: {
            prefix: 'prefix',
            suffix: 'suffix'
          }
        },
        tickDecimals: 3
      };

      expect(customFormatter(0.00499999999999999, axis)).to.equal('prefix0.005suffix');
    });
  });
});
