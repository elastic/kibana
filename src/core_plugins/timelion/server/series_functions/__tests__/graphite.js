import proxyquire from 'proxyquire';
import Promise from 'bluebird';
const expect = require('chai').expect;

const graphiteResponse = function () {
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

const filename = require('path').basename(__filename);
const fn = proxyquire(`../${filename}`, { 'node-fetch': graphiteResponse });

import invoke from './helpers/invoke_series_fn.js';

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
