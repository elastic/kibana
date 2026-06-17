/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fn from './abs';

import _ from 'lodash';
import expect from '@kbn/expect';
const seriesList = require('./fixtures/series_list')();
import invoke from './test_helpers/invoke_series_fn';

describe('abs.js', function () {
  it('should return the positive value of every value', function () {
    return invoke(fn, [seriesList]).then(function (result) {
      const before = _.filter(result.input[0].list[0].data, function (point) {
        return point[1] < 0;
      });

      const after = _.filter(result.output.list[0].data, function (point) {
        return point[1] < 0;
      });

      expect(before.length > 0).to.eql(true);
      expect(result.output.list[0].data.length > 0).to.eql(true);
      expect(after.length).to.eql(0);
    });
  });
});
