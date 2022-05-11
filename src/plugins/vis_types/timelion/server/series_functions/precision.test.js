/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from './precision';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn';

describe('precision.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
  });

  it('keeps the min of a series vs a number', () => {
    return invoke(fn, [seriesList, 2]).then((r) => {
      expect(_.map(r.output.list[3].data, 1)).to.eql([3.14, 2, 1.43, 0.34]);
    });
  });

  it('Adds a _meta to describe the precision to display', () => {
    return invoke(fn, [seriesList, 2]).then((r) => {
      expect(r.output.list[3]._meta.precision).to.eql(2);
    });
  });
});
