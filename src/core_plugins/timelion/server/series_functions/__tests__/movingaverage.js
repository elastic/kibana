const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);
const expect = require('chai').expect;

import moment from 'moment';
import _ from 'lodash';
import buckets from './fixtures/bucketList';
import getSeries from './helpers/get_series';
import getSeriesList from './helpers/get_series_list';
import invoke from './helpers/invoke_series_fn.js';

function getFivePointSeries() {
  return getSeriesList([
    getSeries('Five', [].concat(buckets).push(moment('1984-01-01T00:00:00.000Z')), [10, 20, 30, 40, 50]),
  ]);
}

describe(filename, () => {

  let seriesList;
  beforeEach(() => {
    seriesList = getFivePointSeries();
  });

  it('centers the averaged series by default', () => {
    return invoke(fn, [seriesList, 3]).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([null, 20, 30, 40, null]);
    });
  });


  it('aligns the moving average to the left', () => {
    return invoke(fn, [seriesList, 3, 'left']).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([null, null, 20, 30, 40]);
    });
  });

  it('aligns the moving average to the right', () => {
    return invoke(fn, [seriesList, 3, 'right']).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([20, 30, 40, null, null]);
    });
  });

  describe('date math', () => {
    it('accepts 2 years', () => {
      return invoke(fn, [seriesList, '2y', 'left']).then((r) => {
        expect(_.map(r.output.list[0].data, 1)).to.eql([null, 15, 25, 35, 45]);
      });
    });

    it('accepts 3 years', () => {
      return invoke(fn, [seriesList, '3y', 'left']).then((r) => {
        expect(_.map(r.output.list[0].data, 1)).to.eql([null, null, 20, 30, 40]);
      });
    });
  });


});
