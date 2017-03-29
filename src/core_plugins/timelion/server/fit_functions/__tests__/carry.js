const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);
import moment from 'moment';
const expect = require('chai').expect;
import _ from 'lodash';

describe(filename, function () {
  it('fills holes in the data', function () {
    const data = [
      [moment.utc('1980', 'YYYY').valueOf(), 10],
      [moment.utc('1983', 'YYYY').valueOf(), 40],
      [moment.utc('1984', 'YYYY').valueOf(), 50],
    ];

    const target = [
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
      const data = [
        [moment.utc('1981', 'YYYY').valueOf(), 10],
        [moment.utc('1983', 'YYYY').valueOf(), 30],
        [moment.utc('1985', 'YYYY').valueOf(), 70],
      ];

      const target = [
        [moment.utc('1981', 'YYYY').valueOf(), null],
        [moment.utc('1982', 'YYYY').valueOf(), null],
        [moment.utc('1983', 'YYYY').valueOf(), null],
        [moment.utc('1984', 'YYYY').valueOf(), null],
        [moment.utc('1985', 'YYYY').valueOf(), null],
      ];

      expect(_.map(fn(data, target), 1)).to.eql([10, 10, 30, 30, 70]);
    });


    it('down does not make sense', function () {
      const data = [
        [moment.utc('1980', 'YYYY').valueOf(), 0],
        [moment.utc('1981', 'YYYY').valueOf(), 2],
        [moment.utc('1982', 'YYYY').valueOf(), 4],
        [moment.utc('1983', 'YYYY').valueOf(), 6],
        [moment.utc('1984', 'YYYY').valueOf(), 8],
        [moment.utc('1985', 'YYYY').valueOf(), 10],
        [moment.utc('1986', 'YYYY').valueOf(), 12],
      ];

      const target = [
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
