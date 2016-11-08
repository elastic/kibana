const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);

const expect = require('chai').expect;
const seriesList = require('./fixtures/seriesList.js')();
import invoke from './helpers/invoke_series_fn.js';

describe(filename, function () {
  it('should return exactly the data input', function () {
    return invoke(fn, [seriesList]).then(function (result) {
      expect(result.input[0]).to.eql(result.output);
    });
  });
});
