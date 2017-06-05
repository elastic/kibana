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

  it('hides a series', () => {
    return invoke(fn, [seriesList, true]).then((r) => {
      _.each(r.output.list, (series) => expect(series._hide).to.equal(true));
    });
  });

  it('unhides a series', () => {
    return invoke(fn, [seriesList, false]).then((r) => {
      _.each(r.output.list, (series) => expect(series._hide).to.equal(false));
    });
  });

});
