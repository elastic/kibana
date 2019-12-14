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
import * as geoBoundingBox from '../geo_bounding_box';
import { nodeTypes } from '../../node_types';
import indexPatternResponse from '../../../__fixtures__/index_pattern_response.json';

let indexPattern;
const params = {
  bottomRight: {
    lat: 50.73,
    lon: -135.35,
  },
  topLeft: {
    lat: 73.12,
    lon: -174.37,
  },
};

describe('kuery functions', function() {
  describe('geoBoundingBox', function() {
    beforeEach(() => {
      indexPattern = indexPatternResponse;
    });

    describe('buildNodeParams', function() {
      it('should return an "arguments" param', function() {
        const result = geoBoundingBox.buildNodeParams('geo', params);
        expect(result).to.only.have.keys('arguments');
      });

      it('arguments should contain the provided fieldName as a literal', function() {
        const result = geoBoundingBox.buildNodeParams('geo', params);
        const {
          arguments: [fieldName],
        } = result;

        expect(fieldName).to.have.property('type', 'literal');
        expect(fieldName).to.have.property('value', 'geo');
      });

      it('arguments should contain the provided params as named arguments with "lat, lon" string values', function() {
        const result = geoBoundingBox.buildNodeParams('geo', params);
        const {
          arguments: [, ...args],
        } = result;

        args.map(param => {
          expect(param).to.have.property('type', 'namedArg');
          expect(['bottomRight', 'topLeft'].includes(param.name)).to.be(true);
          expect(param.value.type).to.be('literal');

          const expectedParam = params[param.name];
          const expectedLatLon = `${expectedParam.lat}, ${expectedParam.lon}`;
          expect(param.value.value).to.be(expectedLatLon);
        });
      });
    });

    describe('toElasticsearchQuery', function() {
      it('should return an ES geo_bounding_box query representing the given node', function() {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'geo', params);
        const result = geoBoundingBox.toElasticsearchQuery(node, indexPattern);
        expect(result).to.have.property('geo_bounding_box');
        expect(result.geo_bounding_box.geo).to.have.property('top_left', '73.12, -174.37');
        expect(result.geo_bounding_box.geo).to.have.property('bottom_right', '50.73, -135.35');
      });

      it('should return an ES geo_bounding_box query without an index pattern', function() {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'geo', params);
        const result = geoBoundingBox.toElasticsearchQuery(node);
        expect(result).to.have.property('geo_bounding_box');
        expect(result.geo_bounding_box.geo).to.have.property('top_left', '73.12, -174.37');
        expect(result.geo_bounding_box.geo).to.have.property('bottom_right', '50.73, -135.35');
      });

      it('should use the ignore_unmapped parameter', function() {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'geo', params);
        const result = geoBoundingBox.toElasticsearchQuery(node, indexPattern);
        expect(result.geo_bounding_box.ignore_unmapped).to.be(true);
      });

      it('should throw an error for scripted fields', function() {
        const node = nodeTypes.function.buildNode('geoBoundingBox', 'script number', params);
        expect(geoBoundingBox.toElasticsearchQuery)
          .withArgs(node, indexPattern)
          .to.throwException(/Geo bounding box query does not support scripted fields/);
      });
    });
  });
});
