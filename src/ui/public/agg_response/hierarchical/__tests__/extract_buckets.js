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


import { extractBuckets } from '../_extract_buckets';
import expect from 'expect.js';

describe('buildHierarchicalData()', function () {
  describe('extractBuckets()', function () {

    it('should normalize a bucket object into an array', function () {

      const bucket = {
        buckets: {
          foo: { doc_count: 1 },
          bar: { doc_count: 2 }
        }
      };

      const buckets = extractBuckets(bucket);
      expect(buckets).to.be.an(Array);
      expect(buckets).to.have.length(2);
      expect(buckets[0]).to.have.property('key', 'foo');
      expect(buckets[0]).to.have.property('doc_count', 1);
      expect(buckets[1]).to.have.property('key', 'bar');
      expect(buckets[1]).to.have.property('doc_count', 2);
    });

    it('should return an empty array for undefined buckets', function () {
      const buckets = extractBuckets();
      expect(buckets).to.be.an(Array);
      expect(buckets).to.have.length(0);
    });

    it('should return the bucket array', function () {
      const bucket =  {
        buckets: [
          { key: 'foo', doc_count: 1 },
          { key: 'bar', doc_count: 2 }
        ]
      };
      const buckets = extractBuckets(bucket);
      expect(buckets).to.be.an(Array);
      expect(buckets).to.eql(bucket.buckets);
    });

    it('should attach keys using agg.getKey for array of buckets', () => {
      const bucket = {
        buckets: [
          { from: 10, doc_count: 1 },
          { from: 20, doc_count: 2 }
        ]
      };
      const agg = {
        getKey(bucket) {
          return bucket.from;
        }
      };
      const buckets = extractBuckets(bucket, agg);
      expect(buckets).to.have.length(2);
      expect(buckets[0].key).to.be(10);
      expect(buckets[1].key).to.be(20);
    });

  });
});
