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
import * as geoPolygon from '../geo_polygon';
import { nodeTypes } from '../../node_types';
import indexPatternResponse from '../../../__fixtures__/index_pattern_response.json';


let indexPattern;
const points = [
  {
    lat: 69.77,
    lon: -171.56
  },
  {
    lat: 50.06,
    lon: -169.10
  },
  {
    lat: 69.16,
    lon: -125.85
  }
];

describe('kuery functions', function () {

  describe('geoPolygon', function () {


    beforeEach(() => {
      indexPattern = indexPatternResponse;
    });

    describe('buildNodeParams', function () {

      it('should return an "arguments" param', function () {
        const result = geoPolygon.buildNodeParams('geo', points);
        expect(result).to.only.have.keys('arguments');
      });

      it('arguments should contain the provided fieldName as a literal', function () {
        const result = geoPolygon.buildNodeParams('geo', points);
        const { arguments: [ fieldName ] } = result;

        expect(fieldName).to.have.property('type', 'literal');
        expect(fieldName).to.have.property('value', 'geo');
      });

      it('arguments should contain the provided points literal "lat, lon" string values', function () {
        const result = geoPolygon.buildNodeParams('geo', points);
        const { arguments: [ , ...args ] } = result;

        args.forEach((param, index) => {
          expect(param).to.have.property('type', 'literal');
          const expectedPoint = points[index];
          const expectedLatLon = `${expectedPoint.lat}, ${expectedPoint.lon}`;
          expect(param.value).to.be(expectedLatLon);
        });
      });

    });

    describe('toElasticsearchQuery', function () {

      it('should return an ES geo_polygon query representing the given node', function () {
        const node = nodeTypes.function.buildNode('geoPolygon', 'geo', points);
        const result = geoPolygon.toElasticsearchQuery(node, indexPattern);
        expect(result).to.have.property('geo_polygon');
        expect(result.geo_polygon.geo).to.have.property('points');

        result.geo_polygon.geo.points.forEach((point, index) => {
          const expectedLatLon = `${points[index].lat}, ${points[index].lon}`;
          expect(point).to.be(expectedLatLon);
        });
      });

      it('should return an ES geo_polygon query without an index pattern', function () {
        const node = nodeTypes.function.buildNode('geoPolygon', 'geo', points);
        const result = geoPolygon.toElasticsearchQuery(node);
        expect(result).to.have.property('geo_polygon');
        expect(result.geo_polygon.geo).to.have.property('points');

        result.geo_polygon.geo.points.forEach((point, index) => {
          const expectedLatLon = `${points[index].lat}, ${points[index].lon}`;
          expect(point).to.be(expectedLatLon);
        });
      });

      it('should use the ignore_unmapped parameter', function () {
        const node = nodeTypes.function.buildNode('geoPolygon', 'geo', points);
        const result = geoPolygon.toElasticsearchQuery(node, indexPattern);
        expect(result.geo_polygon.ignore_unmapped).to.be(true);
      });

      it('should throw an error for scripted fields', function () {
        const node = nodeTypes.function.buildNode('geoPolygon', 'script number', points);
        expect(geoPolygon.toElasticsearchQuery)
          .withArgs(node, indexPattern).to.throwException(/Geo polygon query does not support scripted fields/);
      });
    });
  });
});
