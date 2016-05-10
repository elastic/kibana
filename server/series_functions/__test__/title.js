const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);

const _ = require('lodash');
const expect = require('chai').expect;
const invoke = require('./helpers/invoke_series_fn.js');

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
