/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fn from './points';

import _ from 'lodash';
import assert from 'chai';
const expect = assert.expect;
import invoke from './helpers/invoke_series_fn';

describe('points.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list')();
  });

  it('should set the point radius', () => {
    return invoke(fn, [seriesList, 1]).then((r) => {
      expect(r.output.list[0].points.radius).to.equal(1);
    });
  });

  it('should set the point lineWidth', () => {
    return invoke(fn, [seriesList, null, 3]).then((r) => {
      expect(r.output.list[0].points.lineWidth).to.equal(3);
    });
  });

  it('should set the point fill', () => {
    return invoke(fn, [seriesList, null, null, 3]).then((r) => {
      expect(r.output.list[0].points.fill).to.equal(3 / 10);
    });
  });

  it('should not set the fill color if fill is not specified', () => {
    return invoke(fn, [seriesList, null, null, null, '#333']).then((r) => {
      expect(r.output.list[0].points.fillColor).to.equal(undefined);
    });
  });

  it('should set the fill color ', () => {
    return invoke(fn, [seriesList, null, null, 10, '#333']).then((r) => {
      expect(r.output.list[0].points.fillColor).to.equal('#333');
    });
  });

  describe('symbol', () => {
    const symbols = ['triangle', 'cross', 'square', 'diamond', 'circle'];
    _.each(symbols, (symbol) => {
      it(`is ${symbol}`, () => {
        return invoke(fn, [seriesList, null, null, null, null, symbol]).then((r) => {
          expect(r.output.list[0].points.symbol).to.equal(symbol);
        });
      });
    });

    it('does not allow undefined symbols', () => {
      return invoke(fn, [seriesList, null, null, null, null, 'beer'])
        .then(expect.fail)
        .catch((e) => {
          expect(e).to.be.an('error');
        });
    });
  });
});
