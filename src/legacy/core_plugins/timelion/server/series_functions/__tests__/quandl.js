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

import proxyquire from 'proxyquire';
import Bluebird from 'bluebird';
import assert from 'chai';
const expect = assert.expect;

const parseURL = require('url').parse;
const parseQueryString = require('querystring').parse;
const tlConfig = require('./fixtures/tlConfig')();
import moment from 'moment';

const filename = require('path').basename(__filename);
import invoke from './helpers/invoke_series_fn.js';

let fn;
let response;
let calledWith;
describe(filename, function() {
  beforeEach(function() {
    response = function(url) {
      calledWith = {
        params: parseQueryString(parseURL(url).query),
        code: url.match(/datasets\/(.*).json/)[1],
      };
      return Bluebird.resolve({
        json: function() {
          return {
            name: '__beer__',
            data: [
              ['2015-01-01', 3],
              ['2015-01-02', 14],
              ['2015-01-03', 15.92],
              ['2015-01-04', 65.35],
            ],
          };
        },
      });
    };
    fn = proxyquire(`../${filename}`, { 'node-fetch': response });
  });

  it('should wrap the quandl response up in a seriesList', function() {
    return invoke(fn, []).then(function(result) {
      expect(result.output.list[0].data[0][1]).to.eql(3);
      expect(result.output.list[0].data[1][1]).to.eql(14);
    });
  });

  it('should set the label to that of the quandl name', function() {
    return invoke(fn, []).then(function(result) {
      expect(result.output.list[0].label).to.eql('__beer__');
    });
  });

  it('should call the quandl API with the quandl code that has been passed', function() {
    return invoke(fn, ['BEER/IS_GOOD']).then(function() {
      expect(calledWith.code).to.eql('BEER/IS_GOOD');
    });
  });

  it('should limit the time span and interval to the stuff attached to tlConfig', function() {
    return invoke(fn, []).then(function() {
      expect(calledWith.params.trim_start).to.eql(
        moment.utc(tlConfig.time.from).format('YYYY-MM-DD')
      );
      expect(calledWith.params.trim_end).to.eql(moment.utc(tlConfig.time.to).format('YYYY-MM-DD'));
    });
  });

  it('should throw an error is passed an unsupported interval', function() {
    return invoke(fn, [], { time: { interval: '2d' } })
      .then(expect.fail)
      .catch(function(r) {
        expect(r).to.be.an('error');
      });
  });

  it('should use the configured API key when talking to quandl', function() {
    return invoke(fn, [], { settings: { 'timelion:quandl.key': 'bEeR' } }).then(function() {
      expect(calledWith.params.auth_token).to.eql('bEeR');
    });
  });
});
