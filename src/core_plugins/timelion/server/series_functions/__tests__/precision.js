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
    return invoke(fn, [seriesList, 2]).then((r) => {
      expect(_.map(r.output.list[3].data, 1)).to.eql([3.14, 2, 1.43, 0.34]);
    });
  });


  it('Adds a _meta to describe the precision to display', () => {
    return invoke(fn, [seriesList, 2]).then((r) => {
      expect(r.output.list[3]._meta.precision).to.eql(2);
    });
  });
});
