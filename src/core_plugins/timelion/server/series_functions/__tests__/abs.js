const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);

import _ from 'lodash';
const expect = require('chai').expect;
const seriesList = require('./fixtures/seriesList.js')();
import invoke from './helpers/invoke_series_fn.js';

describe(filename, function () {
  it('should return the positive value of every value', function () {

    return invoke(fn, [seriesList]).then(function (result) {
      const before = _.filter(result.input[0].list[0].data, function (point) {
        return (point[1] < 0);
      });

      const after = _.filter(result.output.list[0].data, function (point) {
        return (point[1] < 0);
      });

      expect(before.length > 0).to.eql(true);
      expect(result.output.list[0].data.length > 0).to.eql(true);
      expect(after.length).to.eql(0);
    });
  });
});
