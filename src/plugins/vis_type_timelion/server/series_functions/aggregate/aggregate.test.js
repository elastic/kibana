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

import fn from './index';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from '../helpers/invoke_series_fn.js';

describe('aggregate', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('../fixtures/series_list.js')();
  });

  it('first', () => {
    return invoke(fn, [seriesList, 'first']).then(r => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([100, 100, 100, 100]);
    });
  });

  it('last', () => {
    return invoke(fn, [seriesList, 'last']).then(r => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([20, 20, 20, 20]);
    });
  });

  it('min', () => {
    return invoke(fn, [seriesList, 'min']).then(r => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([20, 20, 20, 20]);
    });
  });

  it('max', () => {
    return invoke(fn, [seriesList, 'max']).then(r => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([100, 100, 100, 100]);
    });
  });

  it('sum', () => {
    return invoke(fn, [seriesList, 'sum']).then(r => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([220, 220, 220, 220]);
    });
  });

  it('cardinality', () => {
    return invoke(fn, [seriesList, 'cardinality']).then(r => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([3, 3, 3, 3]);
    });
  });

  it('avg', () => {
    return invoke(fn, [seriesList, 'avg']).then(r => {
      expect(_.map(r.output.list[1].data, 1)).to.eql([55, 55, 55, 55]);
    });
  });
});
