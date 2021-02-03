/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import fn from './scale_interval';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe('scale_interval.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list.js')();
  });

  it('Can multiply to transform one interval to another', () => {
    return invoke(fn, [seriesList, '5y']).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([500, 250, 250, 100]);
    });
  });
});
