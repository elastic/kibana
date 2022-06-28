/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from './range';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn';

describe('range.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
    seriesList.list[0].data = [
      [1000, 20],
      [2000, 10],
      [3000, 30],
      [4000, 40],
    ];
  });

  it('keeps the min of a series vs a number', () => {
    return invoke(fn, [seriesList, 1, 4]).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([2, 1, 3, 4]);
    });
  });
});
