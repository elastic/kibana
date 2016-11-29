var filename = require('path').basename(__filename);
var fn = require(`../${filename}`);
var moment = require('moment');
var expect = require('chai').expect;
var _ = require('lodash');

describe(filename, function () {
  it('fills holes in the data', function () {
    var data = [
      [moment.utc('1980', 'YYYY').valueOf(), 10],
      [moment.utc('1983', 'YYYY').valueOf(), 40],
      [moment.utc('1984', 'YYYY').valueOf(), 50],
    ];

    var target = [
      [moment.utc('1980', 'YYYY').valueOf(), null],
      [moment.utc('1981', 'YYYY').valueOf(), null],
      [moment.utc('1982', 'YYYY').valueOf(), null],
      [moment.utc('1983', 'YYYY').valueOf(), null],
      [moment.utc('1984', 'YYYY').valueOf(), null],
    ];

    expect(_.map(fn(data, target), 1)).to.eql([10, 10, 10, 40, 50]);
  });

  describe('sampling', function () {
    it('up', function () {
      var data = [
        [moment.utc('1981', 'YYYY').valueOf(), 10],
        [moment.utc('1983', 'YYYY').valueOf(), 30],
        [moment.utc('1985', 'YYYY').valueOf(), 70],
      ];

      var target = [
        [moment.utc('1981', 'YYYY').valueOf(), null],
        [moment.utc('1982', 'YYYY').valueOf(), null],
        [moment.utc('1983', 'YYYY').valueOf(), null],
        [moment.utc('1984', 'YYYY').valueOf(), null],
        [moment.utc('1985', 'YYYY').valueOf(), null],
      ];

      expect(_.map(fn(data, target), 1)).to.eql([10, 10, 30, 30, 70]);
    });


    it('down does not make sense', function () {
      var data = [
        [moment.utc('1980', 'YYYY').valueOf(), 0],
        [moment.utc('1981', 'YYYY').valueOf(), 2],
        [moment.utc('1982', 'YYYY').valueOf(), 4],
        [moment.utc('1983', 'YYYY').valueOf(), 6],
        [moment.utc('1984', 'YYYY').valueOf(), 8],
        [moment.utc('1985', 'YYYY').valueOf(), 10],
        [moment.utc('1986', 'YYYY').valueOf(), 12],
      ];

      var target = [
        [moment.utc('1981', 'YYYY').valueOf(), null],
        [moment.utc('1983', 'YYYY').valueOf(), null],
        [moment.utc('1985', 'YYYY').valueOf(), null],
      ];

      // carry doesn't down sample, it simply doesn't make any sense. Use average or scale
      try {
        fn(data, target);
        expect.fail('Success. Doh.');
      } catch (e) {
        expect(e).to.be.an('error');
      }
    });

  });
});
