/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from './label';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn';

describe('label.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
  });

  it('changes the label on the series', () => {
    return invoke(fn, [seriesList, 'free beer']).then((r) => {
      _.each(r.output.list, (series) => expect(series.label).to.equal('free beer'));
    });
  });

  it('can use a regex to capture parts of a series label', () => {
    return invoke(fn, [seriesList, 'beer$1', 'Neg(.*)']).then((r) => {
      expect(r.output.list[0].label).to.equal('beerative');
    });
  });
});
