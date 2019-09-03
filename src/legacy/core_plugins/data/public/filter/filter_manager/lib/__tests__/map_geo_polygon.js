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
import { mapGeoPolygon } from '../map_geo_polygon';
import IndexPatternMock from 'fixtures/mock_index_patterns';

describe('Filter Bar Directive', function () {
  describe('mapGeoPolygon()', function () {
    let mapGeoPolygonFn;
    let mockIndexPatterns;

    beforeEach(ngMock.module(
      'kibana',
      'kibana/courier'
    ));

    beforeEach(ngMock.inject(function (Private) {
      mockIndexPatterns = Private(IndexPatternMock);
      mapGeoPolygonFn = mapGeoPolygon(mockIndexPatterns);
    }));

    it('should return the key and value for matching filters with bounds', function (done) {
      const filter = {
        meta: {
          index: 'logstash-*'
        },
        geo_polygon: {
          point: { // field name
            points: [
              { lat: 5, lon: 10 },
              { lat: 15, lon: 20 }
            ]
          }
        }
      };
      mapGeoPolygonFn(filter).then(function (result) {
        expect(result).to.have.property('key', 'point');
        expect(result).to.have.property('value');
        // remove html entities and non-alphanumerics to get the gist of the value
        expect(result.value.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).to.be('lat5lon10lat15lon20');
        done();
      });
    });

    it('should return undefined for none matching', function (done) {
      const filter = { meta: { index: 'logstash-*' }, query: { query_string: { query: 'foo:bar' } } };
      mapGeoPolygonFn(filter).catch(function (result) {
        expect(result).to.be(filter);
        done();
      });
    });

    it('should return the key and value even when using ignore_unmapped', function (done) {
      const filter = {
        meta: {
          index: 'logstash-*'
        },
        geo_polygon: {
          ignore_unmapped: true,
          point: { // field name
            points: [
              { lat: 5, lon: 10 },
              { lat: 15, lon: 20 }
            ]
          }
        }
      };
      mapGeoPolygonFn(filter).then(function (result) {
        expect(result).to.have.property('key', 'point');
        expect(result).to.have.property('value');
        // remove html entities and non-alphanumerics to get the gist of the value
        expect(result.value.replace(/&[a-z]+?;/g, '').replace(/[^a-z0-9]/g, '')).to.be('lat5lon10lat15lon20');
        done();
      });
    });

  });
});
