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
import fixtures from 'fixtures/fake_hierarchical_data';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from '../../../vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { VislibSlicesResponseHandlerProvider } from '../../../vis/response_handlers/vislib';
import { tabifyAggResponse } from '../../tabify';

describe('buildHierarchicalData', function () {
  let Vis;
  let indexPattern;
  let responseHandler;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    responseHandler = Private(VislibSlicesResponseHandlerProvider).handler;
  }));

  const buildHierarchicalData = async (aggs, response) => {
    const vis = new Vis(indexPattern, { type: 'histogram',  aggs: aggs });
    vis.isHierarchical = () => true;
    const data = tabifyAggResponse(vis.aggs, response, { metricsAtAllLevels: true });
    return await responseHandler(data);
  };

  describe('metric only', function () {
    let results;

    beforeEach(async function () {
      const aggs = [{
        id: 'agg_1',
        schema: 'metric',
        type: 'avg',
        params: {
          field: 'bytes',
        }
      }];
      results = await buildHierarchicalData(aggs, fixtures.metricOnly);
    });

    it('should set the slices with one child to a consistent label', function () {
      const checkLabel = 'Average bytes';
      expect(results).to.have.property('slices');
      expect(results.slices).to.have.property('children');
      expect(results.slices.children).to.have.length(1);
      expect(results.slices.children[0]).to.have.property('name', checkLabel);
      expect(results.slices.children[0]).to.have.property('size', 412032);
      expect(results).to.have.property('names');
      expect(results.names).to.eql([checkLabel]);
      expect(results).to.have.property('raw');
      expect(results.raw).to.have.property('rows');
      expect(results.raw.rows).to.have.length(1);
    });

  });

  describe('rows and columns', function () {
    let results;

    it('should set the rows', async function () {
      const aggs = [{
        id: 'agg_2',
        type: 'terms',
        schema: 'split',
        params: {
          field: 'extension',
        }
      }, {
        id: 'agg_3',
        type: 'terms',
        schema: 'group',
        params: {
          field: 'geo.src',
        }
      }];
      results = await buildHierarchicalData(aggs, fixtures.threeTermBuckets);
      expect(results).to.have.property('rows');
    });

    it('should set the columns', async function () {
      const aggs = [{
        id: 'agg_2',
        type: 'terms',
        schema: 'split',
        params: {
          row: false,
          field: 'extension',
        }
      }, {
        id: 'agg_3',
        type: 'terms',
        schema: 'group',
        params: {
          field: 'geo.src',
        }
      }];
      results = await buildHierarchicalData(aggs, fixtures.threeTermBuckets);
      expect(results).to.have.property('columns');
    });

  });

  describe('threeTermBuckets', function () {
    let results;

    beforeEach(async function () {
      const aggs = [{
        id: 'agg_1',
        type: 'avg',
        schema: 'metric',
        params: {
          field: 'bytes',
        }
      }, {
        id: 'agg_2',
        type: 'terms',
        schema: 'split',
        params: {
          field: 'extension',
        }
      }, {
        id: 'agg_3',
        type: 'terms',
        schema: 'group',
        params: {
          field: 'geo.src',
        }
      }, {
        id: 'agg_4',
        type: 'terms',
        schema: 'group',
        params: {
          field: 'machine.os',
        }
      }];
      results = await buildHierarchicalData(aggs, fixtures.threeTermBuckets);
    });

    it('should set the hits attribute for the results', function () {
      expect(results).to.have.property('rows');
      _.each(results.rows, function (item) {
        expect(item).to.have.property('names');
        expect(item).to.have.property('slices');
        expect(item.slices).to.have.property('children');
      });
    });

    it('should set the parent of the first item in the split', function () {
      expect(results).to.have.property('rows');
      expect(results.rows).to.have.length(3);
      expect(results.rows[0]).to.have.property('slices');
      expect(results.rows[0].slices).to.have.property('children');
      expect(results.rows[0].slices.children).to.have.length(2);
      expect(results.rows[0].slices.children[0]).to.have.property('aggConfigResult');
      expect(results.rows[0].slices.children[0].aggConfigResult.$parent.$parent).to.have.property('key', 'png');
    });

  });

  describe('oneHistogramBucket', function () {
    let results;

    beforeEach(async function () {
      const aggs = [{
        id: 'agg_2',
        type: 'histogram',
        schema: 'group',
        params: {
          field: 'bytes',
          interval: 8192
        }
      }];
      results = await buildHierarchicalData(aggs, fixtures.oneHistogramBucket);
    });

    it('should set the hits attribute for the results', function () {
      expect(results).to.have.property('slices');
      expect(results.slices).to.property('children');
      expect(results).to.have.property('names');
      expect(results.names).to.have.length(6);
      expect(results).to.have.property('raw');
    });


  });

  describe('oneRangeBucket', function () {
    let results;

    beforeEach(async function () {
      const aggs = [{
        id: 'agg_2',
        type: 'range',
        schema: 'group',
        params: {
          field: 'bytes',
        }
      }];
      results = await buildHierarchicalData(aggs, fixtures.oneRangeBucket);
    });

    it('should set the hits attribute for the results', function () {
      expect(results).to.have.property('slices');
      expect(results.slices).to.property('children');
      expect(results).to.have.property('names');
      expect(results.names).to.have.length(2);
      expect(results).to.have.property('raw');
    });

  });

  describe('oneFilterBucket', function () {
    let results;

    beforeEach(async function () {
      const aggs = [{
        id: 'agg_2',
        type: 'filters',
        schema: 'group',
        params: {
          field: 'geo.src',
          filters: [ { label: 'type:apache' }, { label: 'type:nginx' } ]
        }
      }];
      results = await buildHierarchicalData(aggs, fixtures.oneFilterBucket);
    });

    it('should set the hits attribute for the results', function () {
      expect(results).to.have.property('slices');
      expect(results).to.have.property('names');
      expect(results.names).to.have.length(2);
      expect(results).to.have.property('raw');
    });

  });

});
