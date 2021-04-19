/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const expect = require('chai').expect;

import fn from './graphite';

jest.mock('node-fetch', () => () => {
  return Promise.resolve({
    json: function () {
      return [
        {
          target: '__beer__',
          datapoints: [
            [3, 1000],
            [14, 2000],
            [1.5, 3000],
            [92.6535, 4000],
          ],
        },
      ];
    },
  });
});

import invoke from './helpers/invoke_series_fn.js';

describe('graphite', function () {
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
