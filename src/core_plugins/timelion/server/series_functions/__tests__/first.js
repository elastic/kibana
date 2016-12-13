let filename = require('path').basename(__filename);
let fn = require(`../${filename}`);

let expect = require('chai').expect;
let seriesList = require('./fixtures/seriesList.js')();
let invoke = require('./helpers/invoke_series_fn.js');

describe(filename, function () {
  it('should return exactly the data input', function () {
    return invoke(fn, [seriesList]).then(function (result) {
      expect(result.input[0]).to.eql(result.output);
    });
  });
});
