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

  it('Sets the first and last values to null by default', () => {
    return invoke(fn, [seriesList]).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([null, 50, 50, null]);
    });
  });

  it('Trims more from the beginning', () => {
    return invoke(fn, [seriesList, 2]).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([null, null, 50, null]);
    });
  });

  it('Trims more from the end', () => {
    return invoke(fn, [seriesList, null, 2]).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([null, 50, null, null]);
    });
  });

  it('Trims nothing from the end', () => {
    return invoke(fn, [seriesList, 1, 0]).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([null, 50, 50, 20]);
    });
  });

  it('Trims nothing from the beginning', () => {
    return invoke(fn, [seriesList, 0, 2]).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([100, 50, null, null]);
    });
  });

});
