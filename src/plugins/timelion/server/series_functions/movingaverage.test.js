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

const fn = require(`src/plugins/timelion/server/series_functions/movingaverage`);
const expect = require('chai').expect;

import moment from 'moment';
import _ from 'lodash';
import buckets from './fixtures/bucketList';
import getSeries from './helpers/get_series';
import getSeriesList from './helpers/get_series_list';
import invoke from './helpers/invoke_series_fn.js';

function getFivePointSeries() {
  return getSeriesList([
    getSeries('Five', [].concat(buckets).push(moment('1984-01-01T00:00:00.000Z')), [10, 20, 30, 40, 50]),
  ]);
}

describe('movingaverage.js', () => {

  let seriesList;
  beforeEach(() => {
    seriesList = getFivePointSeries();
  });

  it('centers the averaged series by default', () => {
    return invoke(fn, [seriesList, 3]).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([null, 20, 30, 40, null]);
    });
  });


  it('aligns the moving average to the left', () => {
    return invoke(fn, [seriesList, 3, 'left']).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([null, null, 20, 30, 40]);
    });
  });

  it('aligns the moving average to the right', () => {
    return invoke(fn, [seriesList, 3, 'right']).then((r) => {
      expect(_.map(r.output.list[0].data, 1)).to.eql([20, 30, 40, null, null]);
    });
  });

  describe('date math', () => {
    it('accepts 2 years', () => {
      return invoke(fn, [seriesList, '2y', 'left']).then((r) => {
        expect(_.map(r.output.list[0].data, 1)).to.eql([null, 15, 25, 35, 45]);
      });
    });

    it('accepts 3 years', () => {
      return invoke(fn, [seriesList, '3y', 'left']).then((r) => {
        expect(_.map(r.output.list[0].data, 1)).to.eql([null, null, 20, 30, 40]);
      });
    });
  });


});
