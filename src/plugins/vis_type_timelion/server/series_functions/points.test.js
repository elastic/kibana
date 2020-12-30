/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import fn from './points';

import _ from 'lodash';
import assert from 'chai';
const expect = assert.expect;
import invoke from './helpers/invoke_series_fn.js';

describe('points.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list.js')();
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
