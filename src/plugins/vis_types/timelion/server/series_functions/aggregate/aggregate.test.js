/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from '.';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from '../helpers/invoke_series_fn';

describe('aggregate', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('../fixtures/series_list')();
  });

  it('first', () => {
    return invoke(fn, [seriesList, 'first']).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([100, 100, 100, 100]);
    });
  });

  it('last', () => {
    return invoke(fn, [seriesList, 'last']).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([20, 20, 20, 20]);
    });
  });

  it('min', () => {
    return invoke(fn, [seriesList, 'min']).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([20, 20, 20, 20]);
    });
  });

  it('max', () => {
    return invoke(fn, [seriesList, 'max']).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([100, 100, 100, 100]);
    });
  });

  it('sum', () => {
    return invoke(fn, [seriesList, 'sum']).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([220, 220, 220, 220]);
    });
  });

  it('cardinality', () => {
    return invoke(fn, [seriesList, 'cardinality']).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([3, 3, 3, 3]);
    });
  });

  it('avg', () => {
    return invoke(fn, [seriesList, 'avg']).then((r) => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([55, 55, 55, 55]);
    });
  });
});
