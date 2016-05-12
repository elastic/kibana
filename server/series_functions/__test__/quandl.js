var proxyquire =  require('proxyquire');
var Promise = require('bluebird');
var _ = require('lodash');
var expect = require('chai').expect;

var response = function (url) {
  return Promise.resolve({
    json: function () {
      return {
        name: '__beer__',
        data: [
          ['2015-01-01', 3],
          ['2015-01-02', 14],
          ['2015-01-03', 15.92],
          ['2015-01-04', 65.35],
        ]
      };
    }
  });
};

var filename = require('path').basename(__filename);
var fn = proxyquire(`../${filename}`, {'node-fetch': response});

var invoke = require('./helpers/invoke_series_fn.js');

describe(filename, function () {
  it('should wrap the quandl response up in a seriesList', function () {
    return invoke(fn, []).then(function (result) {
      expect(result.output.list[0].data[0][1]).to.eql(3);
      expect(result.output.list[0].data[1][1]).to.eql(14);
    });
  });

  it('should set the label to that of the quandl name', function () {
    return invoke(fn, []).then(function (result) {
      expect(result.output.list[0].label).to.eql('__beer__');
    });
  });
});
