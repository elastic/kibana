const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe(filename, () => {

  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/seriesList.js')();
  });

  it('centers the averaged series by default', () => {
    return invoke(fn, [seriesList, 2]).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([null, 75, 50, null]);
    });
  });

  it('aligns the moving average to the left', () => {
    return invoke(fn, [seriesList, 2, 'left']).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([null, null, 75, 50]);
    });
  });

  it('aligns the moving average to the right', () => {
    return invoke(fn, [seriesList, 2, 'right']).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([75, 50, null, null]);
    });
  });

});
