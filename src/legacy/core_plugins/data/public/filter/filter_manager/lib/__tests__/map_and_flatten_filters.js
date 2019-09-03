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

import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import { mapAndFlattenFilters } from '../map_and_flatten_filters';
import IndexPatternMock from 'fixtures/mock_index_patterns';

describe('Filter Bar Directive', function () {
  describe('mapAndFlattenFilters()', function () {
    let mockIndexPatterns;

    beforeEach(ngMock.module(
      'kibana',
      'kibana/courier'
    ));

    beforeEach(ngMock.inject(function (Private) {
      mockIndexPatterns = Private(IndexPatternMock);
    }));

    const filters = [
      null,
      [
        { meta: { index: 'logstash-*' }, exists: { field: '_type' } },
        { meta: { index: 'logstash-*' }, missing: { field: '_type' } }
      ],
      { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } },
      { meta: { index: 'logstash-*' }, range: { bytes: { lt: 2048, gt: 1024 } } },
      { meta: { index: 'logstash-*' }, query: { match: { _type: { query: 'apache', type: 'phrase' } } } }
    ];

    it('should map and flatten the filters', function (done) {
      mapAndFlattenFilters(mockIndexPatterns, filters).then(function (results) {
        expect(results).to.have.length(5);
        expect(results[0]).to.have.property('meta');
        expect(results[1]).to.have.property('meta');
        expect(results[2]).to.have.property('meta');
        expect(results[3]).to.have.property('meta');
        expect(results[4]).to.have.property('meta');
        expect(results[0].meta).to.have.property('key', '_type');
        expect(results[0].meta).to.have.property('value', 'exists');
        expect(results[1].meta).to.have.property('key', '_type');
        expect(results[1].meta).to.have.property('value', 'missing');
        expect(results[2].meta).to.have.property('key', 'query');
        expect(results[2].meta).to.have.property('value', 'foo:bar');
        expect(results[3].meta).to.have.property('key', 'bytes');
        expect(results[3].meta).to.have.property('value', '1,024 to 2,048');
        expect(results[4].meta).to.have.property('key', '_type');
        expect(results[4].meta).to.have.property('value', 'apache');
        done();
      });
    });

  });
});
