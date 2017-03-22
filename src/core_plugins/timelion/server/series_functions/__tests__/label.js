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

  it('changes the label on the series', () => {
    return invoke(fn, [seriesList, 'free beer']).then((r) => {
      _.each(r.output.list, (series) => expect(series.label).to.equal('free beer'));
    });
  });

  it('can use a regex to capture parts of a series label', () => {
    return invoke(fn, [seriesList, 'beer$1', 'Neg(.*)']).then((r) => {
      expect(r.output.list[0].label).to.equal('beerative');
    });
  });

});
