let filename = require('path').basename(__filename);
let fn = require(`../${filename}`);

let _ = require('lodash');
let expect = require('chai').expect;
let seriesList = require('./fixtures/seriesList.js')();
let invoke = require('./helpers/invoke_series_fn.js');

describe(filename, function () {
  it('should return the positive value of every value', function () {

    return invoke(fn, [seriesList]).then(function (result) {
      let before = _.filter(result.input[0].list[0].data, function (point) {
        return (point[1] < 0);
      });

      let after = _.filter(result.output.list[0].data, function (point) {
        return (point[1] < 0);
      });

      expect(before.length > 0).to.eql(true);
      expect(result.output.list[0].data.length > 0).to.eql(true);
      expect(after.length).to.eql(0);
    });
  });
});
