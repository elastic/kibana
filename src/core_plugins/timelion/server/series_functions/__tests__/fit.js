const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);
import moment from 'moment';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';
import getSeriesList from './helpers/get_single_series_list';
import _ from 'lodash';

describe(filename, function () {

  describe('carry', function () {
    it('should maintain the previous value until it changes', function () {
      const seriesList = getSeriesList('',[
        [moment.utc('1980-01-01T00:00:00.000Z'), 5],
        [moment.utc('1981-01-01T00:00:00.000Z'), null],
        [moment.utc('1982-01-01T00:00:00.000Z'), 3.4],
        [moment.utc('1983-01-01T00:00:00.000Z'), 171],
      ]);

      return invoke(fn, [seriesList, 'carry']).then(function (r) {
        expect(r.input[0].list[0].data[1][1]).to.equal(null);
        expect(_.map(r.output.list[0].data, 1)).to.eql([5, 5, 3.4, 171]);
        expect(r.output.list[0].data[1][0]).to.not.equal(r.output.list[0].data[0][0]);
      });
    });
  });

  describe('nearest', function () {
    it('should use the closest temporal value to fill the null', function () {
      const seriesList = getSeriesList('',[
        [moment.utc('1980-01-01T00:00:00.000Z'), 5],
        [moment.utc('1981-01-01T00:00:00.000Z'), null],
        [moment.utc('1981-05-01T00:00:00.000Z'), 3.4],
        [moment.utc('1983-01-01T00:00:00.000Z'), 171],
      ]);

      return invoke(fn, [seriesList, 'nearest']).then(function (r) {
        expect(r.input[0].list[0].data[1][1]).to.equal(null);
        expect(_.map(r.output.list[0].data, 1)).to.eql([5, 3.4, 3.4, 171]);
        expect(r.output.list[0].data[1][0]).to.not.equal(r.output.list[0].data[0][0]);
      });
    });
  });



  describe('average', function () {
    it('should produce a smooth, straight line between points', function () {
      const seriesList = getSeriesList('',[
        [moment.utc('1980-01-01T00:00:00.000Z'), 10],
        [moment.utc('1981-07-01T00:00:00.000Z'), null],
        [moment.utc('1982-01-01T00:00:00.000Z'), null],
        [moment.utc('1983-01-01T00:00:00.000Z'), 40],
        [moment.utc('1984-01-01T00:00:00.000Z'), 50],
      ]);

      return invoke(fn, [seriesList, 'average']).then(function (r) {
        expect(r.input[0].list[0].data[1][1]).to.eql(null);
        expect(_.map(r.output.list[0].data, 1)).to.eql([10, 20, 30, 40, 50]);

      });
    });
  });

  describe('scale', function () {
    it('should distribute the next points value across the preceeding nulls', function () {
      const seriesList = getSeriesList('', [
        [moment.utc('1980-01-01T00:00:00.000Z'), 10],
        [moment.utc('1981-07-01T00:00:00.000Z'), null],
        [moment.utc('1982-01-01T00:00:00.000Z'), null],
        [moment.utc('1983-01-01T00:00:00.000Z'), 60],
        [moment.utc('1984-01-01T00:00:00.000Z'), 50],
      ]);

      return invoke(fn, [seriesList, 'scale']).then(function (r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([10, 20, 20, 20, 50]);
      });
    });
  });

  describe('none', function () {
    it('basically just drops the nulls. This is going to screw you', function () {
      const seriesList = getSeriesList('', [
        [moment.utc('1980-01-01T00:00:00.000Z'), 10],
        [moment.utc('1981-07-01T00:00:00.000Z'), null],
        [moment.utc('1982-01-01T00:00:00.000Z'), null],
        [moment.utc('1983-01-01T00:00:00.000Z'), 40],
        [moment.utc('1984-01-01T00:00:00.000Z'), 50],
      ]);

      return invoke(fn, [seriesList, 'none']).then(function (r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([10, 40, 50]);
      });
    });
  });

});
