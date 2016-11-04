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

  it('progressively adds the numbers in the list', () => {
    return invoke(fn, [seriesList]).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([100, 150, 200, 220]);
    });
  });

});
