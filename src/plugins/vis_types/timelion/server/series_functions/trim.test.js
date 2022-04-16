/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from './trim';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn';

describe('trim.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
  });

  it('Sets the first and last values to null by default', () => {
    return invoke(fn, [seriesList]).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([null, 50, 50, null]);
    });
  });

  it('Trims more from the beginning', () => {
    return invoke(fn, [seriesList, 2]).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([null, null, 50, null]);
    });
  });

  it('Trims more from the end', () => {
    return invoke(fn, [seriesList, null, 2]).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([null, 50, null, null]);
    });
  });

  it('Trims nothing from the end', () => {
    return invoke(fn, [seriesList, 1, 0]).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([null, 50, 50, 20]);
    });
  });

  it('Trims nothing from the beginning', () => {
    return invoke(fn, [seriesList, 0, 2]).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([100, 50, null, null]);
    });
  });
});
