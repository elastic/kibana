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

import expect from 'expect.js';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import { AggConfig } from '../../../../ui/public/vis/agg_config';
import AggConfigResult from '../../../../ui/public/vis/agg_config_result';
import { VisProvider } from '../../../../ui/public/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { splitRowsOnColumn, splitTable, legacyTableResponseHandler } from '../legacy_response_handler';

const rows = [
  { 'col-0-2': 'A', 'col-1-3': 100, 'col-2-1': 'Jim' },
  { 'col-0-2': 'A', 'col-1-3': 0, 'col-2-1': 'Dwight' },
  { 'col-0-2': 'B', 'col-1-3': 24, 'col-2-1': 'Angela' },
  { 'col-0-2': 'C', 'col-1-3': 1, 'col-2-1': 'Angela' },
  { 'col-0-2': 'C', 'col-1-3': 7, 'col-2-1': 'Angela' },
  { 'col-0-2': 'C', 'col-1-3': -30, 'col-2-1': 'Jim' },
];

describe('Table Vis Legacy Response Handler', () => {

  let Vis;
  let indexPattern;
  let columns;
  let mockAggConfig;
  let mockSplitAggConfig;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    Vis = Private(VisProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    const vis = new Vis(indexPattern, { type: 'table', aggs: [] });

    mockAggConfig = new AggConfig(vis.aggs, { type: 'terms', schema: 'metric' });
    mockSplitAggConfig = new AggConfig(vis.aggs, { type: 'terms', schema: 'split' });

    sinon.stub(mockSplitAggConfig, 'fieldFormatter').returns(val => val);
    sinon.stub(mockSplitAggConfig, 'makeLabel').returns('some label');

    columns = [
      { id: 'col-0-2', name: 'Team', aggConfig: mockSplitAggConfig },
      { id: 'col-1-3', name: 'Score', aggConfig: mockAggConfig },
      { id: 'col-2-1', name: 'Leader', aggConfig: mockAggConfig },
    ];
  }));

  describe('#splitRowsOnColumn', () => {
    it('should be a function', () => {
      expect(typeof splitRowsOnColumn).to.be('function');
    });

    it('.results should return an array with each unique value for the column id', () => {
      const expected = ['A', 'B', 'C'];
      const actual = splitRowsOnColumn(rows, 'col-0-2');
      expect(actual.results).to.eql(expected);
    });

    it('.results should preserve types in case a result is not a string', () => {
      const expected = [0, 1, 7, 24, 100, -30];
      const actual = splitRowsOnColumn(rows, 'col-1-3');
      expect(actual.results).to.eql(expected);
      actual.results.forEach(result => expect(typeof result).to.eql('number'));
    });

    it('.rowsGroupedByResult should return an object with rows grouped by value for the column id', () => {
      const expected = {
        A: [
          { 'col-1-3': 100, 'col-2-1': 'Jim' },
          { 'col-1-3': 0, 'col-2-1': 'Dwight' },
        ],
        B: [
          { 'col-1-3': 24, 'col-2-1': 'Angela' },
        ],
        C: [
          { 'col-1-3': 1, 'col-2-1': 'Angela' },
          { 'col-1-3': 7, 'col-2-1': 'Angela' },
          { 'col-1-3': -30, 'col-2-1': 'Jim' },
        ],
      };
      const actual = splitRowsOnColumn(rows, 'col-0-2');
      expect(actual.rowsGroupedByResult).to.eql(expected);
    });
  });

  describe('#splitTable', () => {
    it('should be a function', () => {
      expect(typeof splitTable).to.be('function');
    });

    it('should return an array of objects with the expected keys', () => {
      const expected = ['$parent', 'aggConfig', 'title', 'key', 'tables'];
      const actual = splitTable(columns, rows, null);
      expect(Object.keys(actual[0])).to.eql(expected);
    });

    it('should return a reference to the parent AggConfigResult', () => {
      const actual = splitTable(columns, rows, null);
      expect(actual[0].$parent).to.be.a(AggConfigResult);
    });

    it('should return the correct split values', () => {
      const expected = ['A', 'B', 'C'];
      const actual = splitTable(columns, rows, null);
      expect(actual.map(i => i.key)).to.eql(expected);
    });

    it('should return the correct titles', () => {
      const expected = ['A: some label', 'B: some label', 'C: some label'];
      const actual = splitTable(columns, rows, null);
      expect(actual.map(i => i.title)).to.eql(expected);
    });

    it('should return nested split tables with the correct number of entries', () => {
      const expected = [2, 1, 3];
      const actual = splitTable(columns, rows, null);
      expect(actual.map(i => i.tables[0].rows.length)).to.eql(expected);
    });

    it('should return nested split tables with rows of the correct type', () => {
      const actual = splitTable(columns, rows, null);
      expect(actual[0].tables[0].rows[0][0]).to.be.a(AggConfigResult);
    });
  });

  describe('#legacyTableResponseHandler', () => {
    it('should be a function', () => {
      expect(typeof legacyTableResponseHandler).to.be('function');
    });

    it('should return the correct number of tables', async () => {
      const actual = await legacyTableResponseHandler({ columns, rows });
      expect(actual.tables).to.have.length(3);
    });
  });

});
