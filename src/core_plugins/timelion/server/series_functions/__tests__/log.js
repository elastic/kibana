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

  it('should return the log10 value of every value', () => {
    return invoke(fn, [seriesList]).then((r) => {
      expect(_.map(r.output.list[4].data, 1)).to.eql([1, 2, 1, 0]);
    });
  });

});
