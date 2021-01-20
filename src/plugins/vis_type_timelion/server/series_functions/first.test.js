/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import fn from './first';

const expect = require('chai').expect;
const seriesList = require('./fixtures/series_list.js')();
import invoke from './helpers/invoke_series_fn.js';

describe('first.js', function () {
  it('should return exactly the data input', function () {
    return invoke(fn, [seriesList]).then(function (result) {
      expect(result.input[0]).to.eql(result.output);
    });
  });
});
