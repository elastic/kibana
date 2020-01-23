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

const fn = require(`../lines`);

const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';

describe('lines.js', () => {
  let seriesList;
  beforeEach(() => {
    seriesList = require('./fixtures/seriesList.js')();
  });

  it('should simply set show, steps, stack and lineWidth', () => {
    expect(seriesList.list[0]._global).to.equal(undefined);
    return invoke(fn, [seriesList, 1, 2, true, true, false]).then(r => {
      expect(r.output.list[0].lines.lineWidth).to.equal(1);
      expect(r.output.list[0].lines.show).to.equal(true);
      expect(r.output.list[0].stack).to.equal(true);
      expect(r.output.list[0].lines.steps).to.equal(false);
    });
  });

  it('should set lineWidth to 3 by default, and nothing else', () => {
    expect(seriesList.list[0]._global).to.equal(undefined);
    return invoke(fn, [seriesList]).then(r => {
      expect(r.output.list[0].lines.lineWidth).to.equal(3);
      expect(r.output.list[0].lines.fill).to.equal(undefined);
      expect(r.output.list[0].lines.show).to.equal(undefined);
      expect(r.output.list[0].stack).to.equal(undefined);
      expect(r.output.list[0].lines.steps).to.equal(undefined);
    });
  });
});
