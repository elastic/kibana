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
import { TabbedAggResponseWriter } from '../_response_writer';
import { start as visualizationsStart } from '../../../../../core_plugins/visualizations/public/np_ready/public/legacy';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('TabbedAggResponseWriter class', function() {
  let Private;
  let indexPattern;

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(function($injector) {
      Private = $injector.get('Private');

      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    })
  );

  const splitAggConfig = [
    {
      type: 'terms',
      params: {
        field: 'geo.src',
      },
    },
  ];

  const twoSplitsAggConfig = [
    {
      type: 'terms',
      params: {
        field: 'geo.src',
      },
    },
    {
      type: 'terms',
      params: {
        field: 'machine.os.raw',
      },
    },
  ];

  const createResponseWritter = (aggs = [], opts = {}) => {
    const vis = new visualizationsStart.Vis(indexPattern, { type: 'histogram', aggs: aggs });
    return new TabbedAggResponseWriter(vis.getAggConfig(), opts);
  };

  describe('Constructor', function() {
    let responseWriter;
    beforeEach(() => {
      responseWriter = createResponseWritter(twoSplitsAggConfig);
    });

    it('creates aggStack', () => {
      expect(responseWriter.aggStack.length).to.eql(3);
    });

    it('generates columns', () => {
      expect(responseWriter.columns.length).to.eql(3);
    });

    it('correctly generates columns with metricsAtAllLevels set to true', () => {
      const minimalColumnsResponseWriter = createResponseWritter(twoSplitsAggConfig, {
        metricsAtAllLevels: true,
      });
      expect(minimalColumnsResponseWriter.columns.length).to.eql(4);
    });

    describe('sets timeRange', function() {
      it("to the first nested object's range", function() {
        const vis = new visualizationsStart.Vis(indexPattern, { type: 'histogram', aggs: [] });
        const range = {
          gte: 0,
          lte: 100,
        };

        const writer = new TabbedAggResponseWriter(vis.getAggConfig(), {
          timeRange: {
            '@timestamp': range,
          },
        });

        expect(writer.timeRange.gte).to.be(range.gte);
        expect(writer.timeRange.lte).to.be(range.lte);
        expect(writer.timeRange.name).to.be('@timestamp');
      });

      it('to undefined if no nested object', function() {
        const vis = new visualizationsStart.Vis(indexPattern, { type: 'histogram', aggs: [] });

        const writer = new TabbedAggResponseWriter(vis.getAggConfig(), {
          timeRange: {},
        });
        expect(writer).to.have.property('timeRange', undefined);
      });
    });
  });

  describe('row()', function() {
    let responseWriter;

    beforeEach(() => {
      responseWriter = createResponseWritter(splitAggConfig, { partialRows: true });
    });

    it('adds the row to the array', () => {
      responseWriter.rowBuffer['col-0'] = 'US';
      responseWriter.rowBuffer['col-1'] = 5;
      responseWriter.row();
      expect(responseWriter.rows.length).to.eql(1);
      expect(responseWriter.rows[0]).to.eql({ 'col-0': 'US', 'col-1': 5 });
    });

    it('correctly handles bucketBuffer', () => {
      responseWriter.bucketBuffer.push({ id: 'col-0', value: 'US' });
      responseWriter.rowBuffer['col-1'] = 5;
      responseWriter.row();
      expect(responseWriter.rows.length).to.eql(1);
      expect(responseWriter.rows[0]).to.eql({ 'col-0': 'US', 'col-1': 5 });
    });

    it("doesn't add an empty row", () => {
      responseWriter.row();
      expect(responseWriter.rows.length).to.eql(0);
    });
  });

  describe('response()', () => {
    let responseWriter;

    beforeEach(() => {
      responseWriter = createResponseWritter(splitAggConfig);
    });

    it('produces correct response', () => {
      responseWriter.rowBuffer['col-0-1'] = 'US';
      responseWriter.rowBuffer['col-1-2'] = 5;
      responseWriter.row();
      const response = responseWriter.response();
      expect(response).to.have.property('rows');
      expect(response.rows).to.eql([{ 'col-0-1': 'US', 'col-1-2': 5 }]);
      expect(response).to.have.property('columns');
      expect(response.columns.length).to.equal(2);
      expect(response.columns[0]).to.have.property('id', 'col-0-1');
      expect(response.columns[0]).to.have.property('name', 'geo.src: Descending');
      expect(response.columns[0]).to.have.property('aggConfig');
      expect(response.columns[1]).to.have.property('id', 'col-1-2');
      expect(response.columns[1]).to.have.property('name', 'Count');
      expect(response.columns[1]).to.have.property('aggConfig');
    });

    it('produces correct response for no data', () => {
      const response = responseWriter.response();
      expect(response).to.have.property('rows');
      expect(response.rows.length).to.be(0);
      expect(response).to.have.property('columns');
      expect(response.columns.length).to.equal(2);
      expect(response.columns[0]).to.have.property('id', 'col-0-1');
      expect(response.columns[0]).to.have.property('name', 'geo.src: Descending');
      expect(response.columns[0]).to.have.property('aggConfig');
      expect(response.columns[1]).to.have.property('id', 'col-1-2');
      expect(response.columns[1]).to.have.property('name', 'Count');
      expect(response.columns[1]).to.have.property('aggConfig');
    });
  });
});
