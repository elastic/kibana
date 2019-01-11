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
import expect from 'expect.js';
import { convertTableProvider } from '../_convert_table';
import { LegacyResponseHandlerProvider as legacyResponseHandlerProvider } from '../../../vis/response_handlers/legacy';

describe('buildHierarchicalData convertTable', () => {
  const mockToolTipFormatter = () => ({});
  const convertTable = convertTableProvider(mockToolTipFormatter);
  const responseHandler = legacyResponseHandlerProvider().handler;

  describe('metric only', () => {
    let dimensions;
    let table;

    beforeEach(async () => {
      const tabifyResponse = {
        columns: [
          { id: 'col-0-agg_1', name: 'Average bytes' },
        ],
        rows: [
          { 'col-0-agg_1': 412032 },
        ],
      };
      dimensions = {
        metric: {
          accessor: 0,
          format: { id: 'agg_1', params: {} },
          params: { field: 'bytes' },
          aggType: 'avg',
        },
      };

      const tableGroup = await responseHandler(tabifyResponse, dimensions);
      table = tableGroup.tables[0];
    });

    it('should set the slices with one child to a consistent label', () => {
      const results = convertTable(table, dimensions);
      const checkLabel = 'Average bytes';
      expect(results).to.have.property('names');
      expect(results.names).to.eql([checkLabel]);
      expect(results).to.have.property('raw');
      expect(results.raw).to.have.property('rows');
      expect(results.raw.rows).to.have.length(1);
      expect(results).to.have.property('slices');
      expect(results.slices).to.have.property('children');
      expect(results.slices.children).to.have.length(1);
      expect(results.slices.children[0]).to.have.property('name', checkLabel);
      expect(results.slices.children[0]).to.have.property('size', 412032);
    });
  });

  describe('rows and columns', () => {
    let dimensions;
    let table;

    beforeEach(async () => {
      const tabifyResponse = {
        columns: [
          { 'id': 'col-0-agg_2', 'name': 'extension: Descending' },
          { 'id': 'col-1-1', 'name': 'Count' },
          { 'id': 'col-2-agg_3', 'name': 'geo.src: Descending' },
          { 'id': 'col-3-1', 'name': 'Count' }
        ],
        rows: [
          { 'col-0-agg_2': 'png', 'col-2-agg_3': 'IT', 'col-1-1': 50, 'col-3-1': 10 },
          { 'col-0-agg_2': 'png', 'col-2-agg_3': 'US', 'col-1-1': 50, 'col-3-1': 20 },
          { 'col-0-agg_2': 'css', 'col-2-agg_3': 'MX', 'col-1-1': 20, 'col-3-1': 7 },
          { 'col-0-agg_2': 'css', 'col-2-agg_3': 'US', 'col-1-1': 20, 'col-3-1': 13 },
          { 'col-0-agg_2': 'html', 'col-2-agg_3': 'CN', 'col-1-1': 90, 'col-3-1': 85 },
          { 'col-0-agg_2': 'html', 'col-2-agg_3': 'FR', 'col-1-1': 90, 'col-3-1': 15 }
        ]
      };
      dimensions = {
        metric: { accessor: 1, format: { id: '1' }, aggType: 'count' },
        buckets: [
          { accessor: 0, format: { id: 'agg_2' }, params: { field: 'extension' }, aggType: 'terms' },
          { accessor: 2, format: { id: 'agg_3' }, params: { field: 'geo.src' }, aggType: 'terms' },
        ]
      };
      const tableGroup = await responseHandler(tabifyResponse, dimensions);
      table = tableGroup.tables[0];
    });

    it('should set the rows', () => {
      const results = convertTable(table, dimensions);
      expect(results).to.have.property('rows');
    });

    it('should set the columns', () => {
      const results = convertTable(table, dimensions);
      expect(results).to.have.property('columns');
    });

  });

  describe('threeTermBuckets', () => {
    let dimensions;
    let table;

    beforeEach(async () => {
      const tabifyResponse = {
        columns: [
          { 'id': 'col-0-agg_2', 'name': 'extension: Descending' },
          { 'id': 'col-1-agg_1', 'name': 'Average bytes' },
          { 'id': 'col-2-agg_3', 'name': 'geo.src: Descending' },
          { 'id': 'col-3-agg_1', 'name': 'Average bytes' },
          { 'id': 'col-4-agg_4', 'name': 'machine.os: Descending' },
          { 'id': 'col-5-agg_1', 'name': 'Average bytes' }
        ],
        rows: [
          /* eslint-disable max-len */
          { 'col-0-agg_2': 'png', 'col-2-agg_3': 'IT', 'col-4-agg_4': 'win', 'col-1-agg_1': 412032, 'col-3-agg_1': 9299, 'col-5-agg_1': 0 },
          { 'col-0-agg_2': 'png', 'col-2-agg_3': 'IT', 'col-4-agg_4': 'mac', 'col-1-agg_1': 412032, 'col-3-agg_1': 9299, 'col-5-agg_1': 9299 },
          { 'col-0-agg_2': 'png', 'col-2-agg_3': 'US', 'col-4-agg_4': 'linux', 'col-1-agg_1': 412032, 'col-3-agg_1': 8293, 'col-5-agg_1': 3992 },
          { 'col-0-agg_2': 'png', 'col-2-agg_3': 'US', 'col-4-agg_4': 'mac', 'col-1-agg_1': 412032, 'col-3-agg_1': 8293, 'col-5-agg_1': 3029 },
          { 'col-0-agg_2': 'css', 'col-2-agg_3': 'MX', 'col-4-agg_4': 'win', 'col-1-agg_1': 412032, 'col-3-agg_1': 9299, 'col-5-agg_1': 4992 },
          { 'col-0-agg_2': 'css', 'col-2-agg_3': 'MX', 'col-4-agg_4': 'mac', 'col-1-agg_1': 412032, 'col-3-agg_1': 9299, 'col-5-agg_1': 5892 },
          { 'col-0-agg_2': 'css', 'col-2-agg_3': 'US', 'col-4-agg_4': 'linux', 'col-1-agg_1': 412032, 'col-3-agg_1': 8293, 'col-5-agg_1': 3992 },
          { 'col-0-agg_2': 'css', 'col-2-agg_3': 'US', 'col-4-agg_4': 'mac', 'col-1-agg_1': 412032, 'col-3-agg_1': 8293, 'col-5-agg_1': 3029 },
          { 'col-0-agg_2': 'html', 'col-2-agg_3': 'CN', 'col-4-agg_4': 'win', 'col-1-agg_1': 412032, 'col-3-agg_1': 9299, 'col-5-agg_1': 4992 },
          { 'col-0-agg_2': 'html', 'col-2-agg_3': 'CN', 'col-4-agg_4': 'mac', 'col-1-agg_1': 412032, 'col-3-agg_1': 9299, 'col-5-agg_1': 5892 },
          { 'col-0-agg_2': 'html', 'col-2-agg_3': 'FR', 'col-4-agg_4': 'win', 'col-1-agg_1': 412032, 'col-3-agg_1': 8293, 'col-5-agg_1': 3992 },
          { 'col-0-agg_2': 'html', 'col-2-agg_3': 'FR', 'col-4-agg_4': 'mac', 'col-1-agg_1': 412032, 'col-3-agg_1': 8293, 'col-5-agg_1': 3029 }
          /* eslint-enable max-len */
        ]
      };
      dimensions = {
        metric: { accessor: 1, format: { id: 'agg_1' }, params: { field: 'bytes' }, aggType: 'avg' },
        buckets: [
          { accessor: 0, format: { id: 'agg_2' }, params: { field: 'extension' }, aggType: 'terms' },
          { accessor: 2, format: { id: 'agg_3' }, params: { field: 'geo.src' }, aggType: 'terms' },
          { accessor: 4, format: { id: 'agg_4' }, params: { field: 'machine.os' }, aggType: 'terms' },
        ]
      };
      const tableGroup = await responseHandler(tabifyResponse, dimensions);
      table = tableGroup.tables[0];
    });

    it('should set the hits attribute for the results', () => {
      const results = convertTable(table, dimensions);
      expect(results).to.have.property('rows');
      _.each(results.rows, function (item) {
        expect(item).to.have.property('names');
        expect(item).to.have.property('slices');
        expect(item.slices).to.have.property('children');
      });
    });

    it('should set the parent of the first item in the split', () => {
      const results = convertTable(table, dimensions);
      expect(results).to.have.property('rows');
      expect(results.rows).to.have.length(3);
      expect(results.rows[0]).to.have.property('slices');
      expect(results.rows[0].slices).to.have.property('children');
      expect(results.rows[0].slices.children).to.have.length(2);
      expect(results.rows[0].slices.children[0]).to.have.property('aggConfigResult');
      expect(results.rows[0].slices.children[0].aggConfigResult.$parent.$parent).to.have.property('key', 'png');
    });

  });

  describe('oneHistogramBucket', () => {
    let dimensions;
    let table;

    beforeEach(async () => {
      const tabifyResponse = {
        columns: [
          { 'id': 'col-0-agg_2', 'name': 'bytes' },
          { 'id': 'col-1-1', 'name': 'Count' }
        ],
        rows: [
          { 'col-0-agg_2': 1411862400000, 'col-1-1': 8247 },
          { 'col-0-agg_2': 1411948800000, 'col-1-1': 8184 },
          { 'col-0-agg_2': 1412035200000, 'col-1-1': 8269 },
          { 'col-0-agg_2': 1412121600000, 'col-1-1': 8141 },
          { 'col-0-agg_2': 1412208000000, 'col-1-1': 8148 },
          { 'col-0-agg_2': 1412294400000, 'col-1-1': 8219 }
        ]
      };
      dimensions = {
        metric: { accessor: 1, format: { id: '1' }, params: {}, aggType: 'count' },
        buckets: [
          { accessor: 0, format: { id: 'agg_2' }, params: { field: 'bytes', interval: 8192 }, aggType: 'histogram' },
        ]
      };
      const tableGroup = await responseHandler(tabifyResponse, dimensions);
      table = tableGroup.tables[0];
    });

    it('should set the hits attribute for the results', () => {
      const results = convertTable(table, dimensions);
      expect(results).to.have.property('raw');
      expect(results).to.have.property('slices');
      expect(results.slices).to.property('children');
      expect(results).to.have.property('names');
      expect(results.names).to.have.length(6);
    });
  });

  describe('oneRangeBucket', () => {
    let dimensions;
    let table;

    beforeEach(async () => {
      const tabifyResponse = {
        columns: [
          { 'id': 'col-0-agg_2', 'name': 'bytes ranges' },
          { 'id': 'col-1-1', 'name': 'Count' }
        ],
        rows: [
          { 'col-0-agg_2': { 'gte': 0, 'lt': 1000 }, 'col-1-1': 606 },
          { 'col-0-agg_2': { 'gte': 1000, 'lt': 2000 }, 'col-1-1': 298 }
        ]
      };
      dimensions = {
        metric: { accessor: 1, format: { id: '1' }, params: {}, aggType: 'count' },
        buckets: [
          { accessor: 0, format: { id: 'agg_2' }, params: { field: 'bytes' }, aggType: 'range' },
        ]
      };
      const tableGroup = await responseHandler(tabifyResponse, dimensions);
      table = tableGroup.tables[0];
    });

    it('should set the hits attribute for the results', () => {
      const results = convertTable(table, dimensions);
      expect(results).to.have.property('raw');
      expect(results).to.have.property('slices');
      expect(results.slices).to.property('children');
      expect(results).to.have.property('names');
      expect(results.names).to.have.length(2);
    });
  });

  describe('oneFilterBucket', () => {
    let dimensions;
    let table;

    beforeEach(async () => {
      const tabifyResponse = {
        columns: [
          { 'id': 'col-0-agg_2', 'name': 'filters' },
          { 'id': 'col-1-1', 'name': 'Count' }
        ],
        rows: [
          { 'col-0-agg_2': 'type:apache', 'col-1-1': 4844 },
          { 'col-0-agg_2': 'type:nginx', 'col-1-1': 1161 }
        ]
      };
      dimensions = {
        metric: { accessor: 1, format: { id: '1' }, params: {}, aggType: 'count' },
        buckets: [{
          accessor: 0,
          format: { id: 'agg_2' },
          params: {
            field: 'geo.src',
            filters: [
              {
                label: 'type:apache',
                input: { query: 'type:apache' },
              },
              {
                label: 'type:nginx',
                input: { query: 'type:nginx' },
              },
            ],
          },
          aggType: 'filters'
        }],
      };
      const tableGroup = await responseHandler(tabifyResponse, dimensions);
      table = tableGroup.tables[0];
    });

    it('should set the hits attribute for the results', () => {
      const results = convertTable(table, dimensions);
      expect(results).to.have.property('raw');
      expect(results).to.have.property('slices');
      expect(results).to.have.property('names');
      expect(results.names).to.have.length(2);
    });
  });
});
