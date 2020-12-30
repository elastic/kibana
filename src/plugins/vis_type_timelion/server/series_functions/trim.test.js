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

import fn from './trim';

import _ from 'lodash';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe('trim.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/series_list.js')();
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
