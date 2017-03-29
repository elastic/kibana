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

  it('sets the title property', () => {
    return invoke(fn, [seriesList, 'beer']).then((r) => {
      _.each(r.output.list, (series) => expect(series._title).to.equal('beer'));
    });
  });

});
