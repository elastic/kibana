var filename = require('path').basename(__filename);
var fn = require(`../${filename}`);

var expect = require('chai').expect;
var seriesList = require('./fixtures/seriesList.js')();
var invoke = require('./helpers/invoke_series_fn.js');

describe(filename, function () {
  it('should return exactly the data input', function () {
    return invoke(fn, [seriesList]).then(function (result) {
      expect(result.input[0]).to.eql(result.output);
    });
  });
});
