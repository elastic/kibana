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

  it('keeps the min of a series vs a number', () => {
    return invoke(fn, [seriesList, 20]).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([-51, 17, 20, 20]);
    });
  });

});
