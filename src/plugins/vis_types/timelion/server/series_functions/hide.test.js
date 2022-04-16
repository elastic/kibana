/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from './hide';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn';

describe('hide.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
  });

  it('hides a series', () => {
    return invoke(fn, [seriesList, true]).then((r) => {
      _.each(r.output.list, (series) => expect(series._hide).to.equal(true));
    });
  });

  it('unhides a series', () => {
    return invoke(fn, [seriesList, false]).then((r) => {
      _.each(r.output.list, (series) => expect(series._hide).to.equal(false));
    });
  });
});
