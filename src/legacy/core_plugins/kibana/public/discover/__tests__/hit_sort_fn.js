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


import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import PluginsKibanaDiscoverHitSortFnProvider from '../_hit_sort_fn';

describe('hit sort function', function () {
  let createHitSortFn;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    createHitSortFn = Private(PluginsKibanaDiscoverHitSortFnProvider);
  }));


  const runSortTest = function (dir, sortOpts) {
    const groupSize = _.random(10, 30);
    const total = sortOpts.length * groupSize;

    sortOpts = sortOpts.map(function (opt) {
      if (Array.isArray(opt)) return opt;
      else return [opt];
    });
    const sortOptLength = sortOpts.length;

    const hits = _.times(total, function (i) {
      return {
        _source: {},
        sort: sortOpts[i % sortOptLength]
      };
    });

    hits.sort(createHitSortFn(dir))
      .forEach(function (hit, i) {
        const group = Math.floor(i / groupSize);
        expect(hit.sort).to.eql(sortOpts[group]);
      });
  };


  it('sorts a list of hits in ascending order', function () {
    runSortTest('asc', [200, 404, 500]);
  });

  it('sorts a list of hits in descending order', function () {
    runSortTest('desc', [10, 3, 1]);
  });

  it('breaks ties in ascending order', function () {
    runSortTest('asc', [
      [ 'apache',  200,  'facebook.com' ],
      [ 'apache',  200,  'twitter.com'  ],
      [ 'apache',  301,  'facebook.com' ],
      [ 'apache',  301,  'twitter.com'  ],
      [ 'nginx',   200,  'facebook.com' ],
      [ 'nginx',   200,  'twitter.com'  ],
      [ 'nginx',   301,  'facebook.com' ],
      [ 'nginx',   301,  'twitter.com'  ]
    ]);
  });

  it('breaks ties in descending order', function () {
    runSortTest('desc', [
      [ 'nginx',   301,  'twitter.com'  ],
      [ 'nginx',   301,  'facebook.com' ],
      [ 'nginx',   200,  'twitter.com'  ],
      [ 'nginx',   200,  'facebook.com' ],
      [ 'apache',  301,  'twitter.com'  ],
      [ 'apache',  301,  'facebook.com' ],
      [ 'apache',  200,  'twitter.com'  ],
      [ 'apache',  200,  'facebook.com' ]
    ]);
  });
});
