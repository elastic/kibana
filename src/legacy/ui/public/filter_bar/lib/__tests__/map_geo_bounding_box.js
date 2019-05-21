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
import { mapGeoBoundingBox } from '../map_geo_bounding_box';
import IndexPatternMock from 'fixtures/mock_index_patterns';

describe('Filter Bar Directive', function () {
  describe('mapGeoBoundingBox()', function () {
    let mapGeoBoundingBoxFn;
    let mockIndexPatterns;

    beforeEach(ngMock.module(
      'kibana',
      'kibana/courier'
    ));

    beforeEach(ngMock.inject(function (Private) {
      mockIndexPatterns = Private(IndexPatternMock);
      mapGeoBoundingBoxFn = mapGeoBoundingBox(mockIndexPatterns);
    }));

    it('should return the key and value for matching filters with bounds', function (done) {
      const filter = {
        meta: {
          index: 'logstash-*'
        },
        geo_bounding_box: {
          point: { // field name
            top_left: { lat: 5, lon: 10 },
            bottom_right: { lat: 15, lon: 20 }
          }
        }
      };
      mapGeoBoundingBoxFn(filter).then(function (result) {
        expect(result).to.have.property('key', 'point');
        expect(result).to.have.property('value');
        // remove html entities and non-alphanumerics to get the gist of the value
        expect(result.value.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).to.be('lat5lon10tolat15lon20');
        done();
      });
    });

    it('should return undefined for none matching', function (done) {
      const filter = { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } };
      mapGeoBoundingBoxFn(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
    });

    it('should return the key and value even when using ignore_unmapped', function (done) {
      const filter = {
        meta: {
          index: 'logstash-*'
        },
        geo_bounding_box: {
          ignore_unmapped: true,
          point: { // field name
            top_left: { lat: 5, lon: 10 },
            bottom_right: { lat: 15, lon: 20 }
          }
        }
      };
      mapGeoBoundingBoxFn(filter).then(function (result) {
        expect(result).to.have.property('key', 'point');
        expect(result).to.have.property('value');
        // remove html entities and non-alphanumerics to get the gist of the value
        expect(result.value.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).to.be('lat5lon10tolat15lon20');
        done();
      });
    });

  });
});
