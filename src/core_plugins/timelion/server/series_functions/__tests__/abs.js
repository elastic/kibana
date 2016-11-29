var filename = require('path').basename(__filename);
var fn = require(`../${filename}`);

var _ = require('lodash');
var expect = require('chai').expect;
var seriesList = require('./fixtures/seriesList.js')();
var invoke = require('./helpers/invoke_series_fn.js');

describe(filename, function () {
  it('should return the positive value of every value', function () {

    return invoke(fn, [seriesList]).then(function (result) {
      var before = _.filter(result.input[0].list[0].data, function (point) {
        return (point[1] < 0);
      });

      var after = _.filter(result.output.list[0].data, function (point) {
        return (point[1] < 0);
      });

      expect(before.length > 0).to.eql(true);
      expect(result.output.list[0].data.length > 0).to.eql(true);
      expect(after.length).to.eql(0);
    });
  });
});
