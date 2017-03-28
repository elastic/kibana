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

  it('computes the moving standard deviation of a list', () => {
    return invoke(fn, [seriesList, 2]).then((r) => {
      const values = _.map(r.output.list[1].data, 1);
      expect(values[0]).to.equal(null);
      expect(values[1]).to.equal(null);
      expect(values[2]).to.be.within(26, 27);
      expect(values[3]).to.be.within(7, 8);
    });
  });

});
