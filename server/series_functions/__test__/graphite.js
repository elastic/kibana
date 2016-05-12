var proxyquire =  require('proxyquire');
var Promise = require('bluebird');
var _ = require('lodash');
var expect = require('chai').expect;

var graphiteResponse = function (url) {
  return Promise.resolve({
    json: function () {
      return [{
        target: '__beer__',
        datapoints: [
          [3, 1000],
          [14, 2000],
          [1.5, 3000],
          [92.6535, 4000],
        ]
      }];
    }
  });
};

var filename = require('path').basename(__filename);
var fn = proxyquire(`../${filename}`, {'node-fetch': graphiteResponse});

var invoke = require('./helpers/invoke_series_fn.js');

describe(filename, function () {
  it('should wrap the graphite response up in a seriesList', function () {
    return invoke(fn, []).then(function (result) {
      expect(result.output.list[0].data[0][1]).to.eql(3);
      expect(result.output.list[0].data[1][1]).to.eql(14);
    });
  });

  it('should convert the seconds to milliseconds', function () {
    return invoke(fn, []).then(function (result) {
      expect(result.output.list[0].data[1][0]).to.eql(2000 * 1000);
    });
  });

  it('should set the label to that of the graphite target', function () {
    return invoke(fn, []).then(function (result) {
      expect(result.output.list[0].label).to.eql('__beer__');
    });
  });
});
