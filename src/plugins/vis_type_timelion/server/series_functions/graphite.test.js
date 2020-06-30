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

const expect = require('chai').expect;

import fn from './graphite';

jest.mock('node-fetch', () => () => {
  return Promise.resolve({
    json: function () {
      return [
        {
          target: '__beer__',
          datapoints: [
            [3, 1000],
            [14, 2000],
            [1.5, 3000],
            [92.6535, 4000],
          ],
        },
      ];
    },
  });
});

import invoke from './helpers/invoke_series_fn.js';

describe('graphite', function () {
  it('should wrap the graphite response up in a seriesList', function () {
    return invoke(fn, []).then(function (result) {
      expect(result.output.list[0].data[0][1]).to.eql(3);
      expect(result.output.list[0].data[1][1]).to.eql(14);
    });
  });

  it('should convert the seconds to milliseconds', function () {
    return invoke(fn, []).then(function (result) {
      expect(result.output.list[0].data[1][0]).to.eql(2000 * 1000);
    });
  });

  it('should set the label to that of the graphite target', function () {
    return invoke(fn, []).then(function (result) {
      expect(result.output.list[0].label).to.eql('__beer__');
    });
  });
});
