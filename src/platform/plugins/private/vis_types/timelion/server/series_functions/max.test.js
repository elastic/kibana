/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fn from './max';

import _ from 'lodash';
import expect from '@kbn/expect';
import invoke from './test_helpers/invoke_series_fn';

describe('max.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
  });

  it('keeps the max of a series vs a number', () => {
    return invoke(fn, [seriesList, 20]).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([20, 20, 82, 20]);
    });
  });
});
