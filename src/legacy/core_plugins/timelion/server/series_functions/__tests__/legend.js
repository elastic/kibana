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

const fn = require(`../legend`);

const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe('legend.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/seriesList.js')();
  });

  it('should create the _global object if it does not exist', () => {
    expect(seriesList.list[0]._global).to.equal(undefined);
    return invoke(fn, [seriesList, 'nw', 3, true, 'YYYY']).then(r => {
      expect(r.output.list[0]._global).to.eql({
        legend: { noColumns: 3, position: 'nw', showTime: true, timeFormat: 'YYYY' },
      });
    });
  });

  it('should provide default values for time axis display', () => {
    return invoke(fn, [seriesList, 'nw', 3]).then(r => {
      expect(r.output.list[0]._global.legend.showTime).to.equal(true);
      expect(r.output.list[0]._global.legend.timeFormat).to.equal('MMMM Do YYYY, HH:mm:ss.SSS');
    });
  });

  it('should hide the legend is position is false', () => {
    return invoke(fn, [seriesList, false]).then(r => {
      expect(r.output.list[0]._global.legend.show).to.equal(false);
      expect(r.output.list[0]._global.legend.showTime).to.equal(false);
    });
  });

  it('should set legend.showTime to false when showTime parameter is false', () => {
    return invoke(fn, [seriesList, 'nw', 3, false]).then(r => {
      expect(r.output.list[0]._global.legend.showTime).to.equal(false);
    });
  });
});
