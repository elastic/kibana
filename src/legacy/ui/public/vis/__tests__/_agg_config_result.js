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

import AggConfigResult from '../agg_config_result';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import { VisProvider } from '..';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
describe('AggConfigResult', function () {
  let indexPattern;
  let Vis;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  describe('initialization', function () {
    it('should set the type to bucket for bucket based results', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [ { type: 'terms', schema: 'segment', params: { field: '_type' } } ]
      });
      const aggConfig = vis.aggs.byTypeName.terms[0];
      const results = new AggConfigResult(aggConfig, null, 10, 'apache');
      expect(results).to.have.property('aggConfig', aggConfig);
      expect(results).to.have.property('$parent', null);
      expect(results).to.have.property('type', 'bucket');
      expect(results).to.have.property('value', 10);
      expect(results).to.have.property('key', 'apache');
    });

    it('should set the type to metric for metric based results', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [ { type: 'avg', schema: 'metric', params: { field: 'bytes' } } ]
      });
      const aggConfig = vis.aggs.byTypeName.avg[0];
      const results = new AggConfigResult(aggConfig, null, 1024);
      expect(results).to.have.property('aggConfig', aggConfig);
      expect(results).to.have.property('$parent', null);
      expect(results).to.have.property('type', 'metric');
      expect(results).to.have.property('value', 1024);
      expect(results).to.have.property('key', undefined);
    });
  });


  describe('hierarchical', function () {
    describe('getPath()', function () {

      it('should return the parent and itself (in an array) for the path', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', schema: 'segment', params: { field: '_type' } },
            { type: 'terms', schema: 'segment', params: { field: 'extension' } }
          ]
        });
        const parentAggConfig = vis.aggs.byTypeName.terms[0];
        const aggConfig = vis.aggs.byTypeName.terms[1];
        const parentResult = new AggConfigResult(parentAggConfig, null, 20, 'apache');
        const result = new AggConfigResult(aggConfig, parentResult, 15, 'php');
        const path = result.getPath();
        expect(path).to.be.an(Array);
        expect(path).to.have.length(2);
        expect(path[0]).to.be(parentResult);
        expect(path[1]).to.be(result);
      });

      it('should return itself (in an array) for the path', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', schema: 'segment', params: { field: 'extension' } }
          ]
        });
        const aggConfig = vis.aggs.byTypeName.terms[0];
        const result = new AggConfigResult(aggConfig, null, 15, 'php');
        const path = result.getPath();
        expect(path).to.be.an(Array);
        expect(path).to.have.length(1);
        expect(path[0]).to.be(result);
      });

    });

    describe('createFilter', function () {
      it('should return a filter object that represents the result', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', schema: 'segment', params: { field: 'extension' } }
          ]
        });
        const aggConfig = vis.aggs.byTypeName.terms[0];
        const result = new AggConfigResult(aggConfig, null, 15, 'php');
        const filter = result.createFilter();
        expect(filter).to.have.property('query');
        expect(filter.query).to.have.property('match');
        expect(filter.query.match).to.have.property('extension');
        expect(filter.query.match.extension).to.have.property('query', 'php');
        expect(filter.query.match.extension).to.have.property('type', 'phrase');
      });
    });

    describe('toString', function () {
      it('should provide a parsedUrl to the field formatter', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            { type: 'terms', schema: 'segment', params: { field: 'extension' } }
          ]
        });

        const aggConfig = vis.aggs.byTypeName.terms[0];
        aggConfig.fieldFormatter = () => {
          return (value, second, third, parsedUrl) => {
            return parsedUrl;
          };
        };
        const result = new AggConfigResult(aggConfig, null, '../app/kibana/#visualize', 'php');
        const parsedUrl = result.toString('html');
        const keys = Object.keys(parsedUrl);
        expect(keys[0]).to.be('origin');
        expect(keys[1]).to.be('pathname');
        expect(keys[2]).to.be('basePath');
      });
    });
  });
});
