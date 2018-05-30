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

import expect from 'expect.js';
import { TabifyBuckets } from '../_buckets';

describe('Buckets wrapper', function () {

  function test(aggResp, count, keys) {
    it('reads the length', function () {
      const buckets = new TabifyBuckets(aggResp);
      expect(buckets).to.have.length(count);
    });

    it('itterates properly, passing in the key', function () {
      const buckets = new TabifyBuckets(aggResp);
      const keysSent = [];
      buckets.forEach(function (bucket, key) {
        keysSent.push(key);
      });

      expect(keysSent).to.have.length(count);
      expect(keysSent).to.eql(keys);
    });
  }

  describe('with object style buckets', function () {
    const aggResp = {
      buckets: {
        '0-100': {},
        '100-200': {},
        '200-300': {}
      }
    };

    const count = 3;
    const keys = ['0-100', '100-200', '200-300'];

    test(aggResp, count, keys);
  });

  describe('with array style buckets', function () {
    const aggResp = {
      buckets: [
        { key: '0-100', value: {} },
        { key: '100-200', value: {} },
        { key: '200-300', value: {} }
      ]
    };

    const count = 3;
    const keys = ['0-100', '100-200', '200-300'];

    test(aggResp, count, keys);
  });

  describe('with single bucket aggregations (filter)', function () {
    it('creates single bucket from agg content', function () {
      const aggResp = {
        single_bucket: {},
        doc_count: 5
      };
      const buckets = new TabifyBuckets(aggResp);
      expect(buckets).to.have.length(1);
    });
  });
});
