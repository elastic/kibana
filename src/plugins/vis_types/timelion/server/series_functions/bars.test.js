/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from './bars';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn';

describe('bars.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
  });

  it('creates the bars property, with defaults, on all series', () => {
    return invoke(fn, [seriesList]).then((r) => {
      const bars = _.map(r.output.list, 'bars');
      _.each(bars, (bar) => expect(bar).to.be.a('object'));
      _.each(bars, (bar) => expect(bar.lineWidth).to.equal(6));
      _.each(bars, (bar) => expect(bar.show).to.equal(1));
    });
  });

  it('leaves existing bars alone when called without option, if they exist', () => {
    seriesList.list[0].bars = { foo: true };
    return invoke(fn, [seriesList]).then((r) => {
      const bars = _.map(r.output.list, 'bars');
      expect(bars[0].foo).to.equal(true);
      expect(bars[1].foo).to.equal(undefined);
    });
  });

  it('sets lineWidth and show to the same value', () => {
    return invoke(fn, [seriesList, 0]).then((r) => {
      const bars = _.map(r.output.list, 'bars');
      expect(bars[0].lineWidth).to.equal(0);
      expect(bars[0].show).to.equal(0);
    });
  });
});
