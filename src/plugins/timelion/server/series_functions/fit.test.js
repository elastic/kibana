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

const fn = require(`src/plugins/timelion/server/series_functions/fit`);
import moment from 'moment';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';
import getSeriesList from './helpers/get_single_series_list';
import _ from 'lodash';

describe('fit.js', function() {
  describe('should not filter out zeros', function() {
    it('all zeros', function() {
      const seriesList = getSeriesList('', [
        [moment.utc('1980-01-01T00:00:00.000Z'), 0],
        [moment.utc('1981-01-01T00:00:00.000Z'), null],
        [moment.utc('1982-01-01T00:00:00.000Z'), 0],
        [moment.utc('1983-01-01T00:00:00.000Z'), 0],
      ]);

      return invoke(fn, [seriesList, 'carry']).then(function(r) {
        expect(r.input[0].list[0].data[1][1]).to.equal(null);
        expect(_.map(r.output.list[0].data, 1)).to.eql([0, 0, 0, 0]);
        expect(r.output.list[0].data[1][0]).to.not.equal(r.output.list[0].data[0][0]);
      });
    });

    it('mixed zeros and numbers', function() {
      const seriesList = getSeriesList('', [
        [moment.utc('1980-01-01T00:00:00.000Z'), 26],
        [moment.utc('1981-01-01T00:00:00.000Z'), 42],
        [moment.utc('1982-01-01T00:00:00.000Z'), 0],
        [moment.utc('1983-01-01T00:00:00.000Z'), null],
        [moment.utc('1984-01-01T00:00:00.000Z'), 1],
      ]);

      return invoke(fn, [seriesList, 'carry']).then(function(r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([26, 42, 0, 0, 1]);
      });
    });
  });

  it('should return original series when all values are null', function() {
    const seriesList = getSeriesList('', [
      [moment.utc('1980-01-01T00:00:00.000Z'), null],
      [moment.utc('1981-01-01T00:00:00.000Z'), null],
      [moment.utc('1982-01-01T00:00:00.000Z'), null],
      [moment.utc('1983-01-01T00:00:00.000Z'), null],
    ]);

    return invoke(fn, [seriesList, 'carry']).then(function(r) {
      expect(_.map(r.output.list[0].data, 1)).to.eql([null, null, null, null]);
    });
  });

  describe('carry', function() {
    it('should maintain the previous value until it changes', function() {
      const seriesList = getSeriesList('', [
        [moment.utc('1980-01-01T00:00:00.000Z'), 5],
        [moment.utc('1981-01-01T00:00:00.000Z'), null],
        [moment.utc('1982-01-01T00:00:00.000Z'), 3.4],
        [moment.utc('1983-01-01T00:00:00.000Z'), 171],
      ]);

      return invoke(fn, [seriesList, 'carry']).then(function(r) {
        expect(r.input[0].list[0].data[1][1]).to.equal(null);
        expect(_.map(r.output.list[0].data, 1)).to.eql([5, 5, 3.4, 171]);
        expect(r.output.list[0].data[1][0]).to.not.equal(r.output.list[0].data[0][0]);
      });
    });
  });

  describe('nearest', function() {
    it('should use the closest temporal value to fill the null', function() {
      const seriesList = getSeriesList('', [
        [moment.utc('1980-01-01T00:00:00.000Z'), 5],
        [moment.utc('1981-01-01T00:00:00.000Z'), null],
        [moment.utc('1981-05-01T00:00:00.000Z'), 3.4],
        [moment.utc('1983-01-01T00:00:00.000Z'), 171],
      ]);

      return invoke(fn, [seriesList, 'nearest']).then(function(r) {
        expect(r.input[0].list[0].data[1][1]).to.equal(null);
        expect(_.map(r.output.list[0].data, 1)).to.eql([5, 3.4, 3.4, 171]);
        expect(r.output.list[0].data[1][0]).to.not.equal(r.output.list[0].data[0][0]);
      });
    });
  });

  describe('average', function() {
    it('should produce a smooth, straight line between points', function() {
      const seriesList = getSeriesList('', [
        [moment.utc('1980-01-01T00:00:00.000Z'), 10],
        [moment.utc('1981-07-01T00:00:00.000Z'), null],
        [moment.utc('1982-01-01T00:00:00.000Z'), null],
        [moment.utc('1983-01-01T00:00:00.000Z'), 40],
        [moment.utc('1984-01-01T00:00:00.000Z'), 50],
      ]);

      return invoke(fn, [seriesList, 'average']).then(function(r) {
        expect(r.input[0].list[0].data[1][1]).to.eql(null);
        expect(_.map(r.output.list[0].data, 1)).to.eql([10, 20, 30, 40, 50]);
      });
    });
  });

  describe('scale', function() {
    it('should distribute the next points value across the preceeding nulls', function() {
      const seriesList = getSeriesList('', [
        [moment.utc('1980-01-01T00:00:00.000Z'), 10],
        [moment.utc('1981-07-01T00:00:00.000Z'), null],
        [moment.utc('1982-01-01T00:00:00.000Z'), null],
        [moment.utc('1983-01-01T00:00:00.000Z'), 60],
        [moment.utc('1984-01-01T00:00:00.000Z'), 50],
      ]);

      return invoke(fn, [seriesList, 'scale']).then(function(r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([10, 20, 20, 20, 50]);
      });
    });
  });

  describe('none', function() {
    it('basically just drops the nulls. This is going to screw you', function() {
      const seriesList = getSeriesList('', [
        [moment.utc('1980-01-01T00:00:00.000Z'), 10],
        [moment.utc('1981-07-01T00:00:00.000Z'), null],
        [moment.utc('1982-01-01T00:00:00.000Z'), null],
        [moment.utc('1983-01-01T00:00:00.000Z'), 40],
        [moment.utc('1984-01-01T00:00:00.000Z'), 50],
      ]);

      return invoke(fn, [seriesList, 'none']).then(function(r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([10, 40, 50]);
      });
    });
  });
});
