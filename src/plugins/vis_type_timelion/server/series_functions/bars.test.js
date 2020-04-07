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

import fn from './bars';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe('bars.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list.js')();
  });

  it('creates the bars property, with defaults, on all series', () => {
    return invoke(fn, [seriesList]).then(r => {
      const bars = _.map(r.output.list, 'bars');
      _.each(bars, bar => expect(bar).to.be.a('object'));
      _.each(bars, bar => expect(bar.lineWidth).to.equal(6));
      _.each(bars, bar => expect(bar.show).to.equal(1));
    });
  });

  it('leaves existing bars alone when called without option, if they exist', () => {
    seriesList.list[0].bars = { foo: true };
    return invoke(fn, [seriesList]).then(r => {
      const bars = _.map(r.output.list, 'bars');
      expect(bars[0].foo).to.equal(true);
      expect(bars[1].foo).to.equal(undefined);
    });
  });

  it('sets lineWidth and show to the same value', () => {
    return invoke(fn, [seriesList, 0]).then(r => {
      const bars = _.map(r.output.list, 'bars');
      expect(bars[0].lineWidth).to.equal(0);
      expect(bars[0].show).to.equal(0);
    });
  });
});
