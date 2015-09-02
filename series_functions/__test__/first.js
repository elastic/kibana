var first = require('../first.js');
var expect = require('chai').expect;
var Chainable = require('../../lib/classes/chainable.js');
var seriesList = require('./fixtures/seriesList.js');
var invoke = require('./helpers/invoke_series_fn.js');

describe('first()', function () {
  it('should be chainable', function () {
    expect(first).to.be.an.instanceOf(Chainable);
  });

  it('should return exactly the data input', function (done) {
    invoke(first.fn, [seriesList]).then(function (result) {
      expect(result.input[0]).to.eql(result.output);
      done();
    });
  });
});