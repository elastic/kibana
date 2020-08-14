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

import { TabbedAggResponseWriter } from './response_writer';
import { AggConfigs, BUCKET_TYPES } from '../aggs';
import { mockAggTypesRegistry } from '../aggs/test_helpers';
import { TabbedResponseWriterOptions } from './types';

describe('TabbedAggResponseWriter class', () => {
  let responseWriter: TabbedAggResponseWriter;

  const typesRegistry = mockAggTypesRegistry();

  const splitAggConfig = [
    {
      type: BUCKET_TYPES.TERMS,
      params: {
        field: 'geo.src',
      },
    },
    { type: 'count' },
  ];

  const twoSplitsAggConfig = [
    {
      type: BUCKET_TYPES.TERMS,
      params: {
        field: 'geo.src',
      },
    },
    {
      type: BUCKET_TYPES.TERMS,
      params: {
        field: 'machine.os.raw',
      },
    },
    { type: 'count' },
  ];

  const createResponseWritter = (aggs: any[] = [], opts?: Partial<TabbedResponseWriterOptions>) => {
    const fields = [
      {
        name: 'geo.src',
      },
      {
        name: 'machine.os.raw',
      },
    ];

    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: (name: string) => fields.find((f) => f.name === name),
        filter: () => fields,
      },
    } as any;

    return new TabbedAggResponseWriter(new AggConfigs(indexPattern, aggs, { typesRegistry }), {
      metricsAtAllLevels: false,
      partialRows: false,
      ...opts,
    });
  };

  describe('Constructor', () => {
    beforeEach(() => {
      responseWriter = createResponseWritter(twoSplitsAggConfig);
    });

    test('generates columns', () => {
      expect(responseWriter.columns.length).toEqual(3);
    });

    test('correctly generates columns with metricsAtAllLevels set to true', () => {
      const minimalColumnsResponseWriter = createResponseWritter(twoSplitsAggConfig, {
        metricsAtAllLevels: true,
      });

      expect(minimalColumnsResponseWriter.columns.length).toEqual(4);
    });

    describe('row()', () => {
      beforeEach(() => {
        responseWriter = createResponseWritter(splitAggConfig);
      });

      test('adds the row to the array', () => {
        responseWriter.bucketBuffer = [{ id: 'col-0-1', value: 'US' }];
        responseWriter.metricBuffer = [{ id: 'col-1-2', value: 5 }];

        responseWriter.row();

        expect(responseWriter.rows.length).toEqual(1);
        expect(responseWriter.rows[0]).toEqual({ 'col-0-1': 'US', 'col-1-2': 5 });
      });

      test("doesn't add an empty row", () => {
        responseWriter.row();

        expect(responseWriter.rows.length).toEqual(0);
      });

      test('doesnt add a partial row', () => {
        responseWriter.bucketBuffer = [{ id: 'col-0-1', value: 'US' }];
        responseWriter.row();

        expect(responseWriter.rows.length).toEqual(0);
      });

      test('adds partial row if partialRows is set to true', () => {
        responseWriter = createResponseWritter(splitAggConfig, { partialRows: true });
        responseWriter.bucketBuffer = [{ id: 'col-0-1', value: 'US' }];
        responseWriter.row();

        expect(responseWriter.rows.length).toEqual(1);
      });
    });

    describe('response()', () => {
      beforeEach(() => {
        responseWriter = createResponseWritter(splitAggConfig);
      });

      test('produces correct response', () => {
        responseWriter.bucketBuffer = [
          { id: 'col-0-1', value: 'US' },
          { id: 'col-1-2', value: 5 },
        ];
        responseWriter.row();

        const response = responseWriter.response();

        expect(response).toHaveProperty('rows');
        expect(response.rows).toEqual([{ 'col-0-1': 'US', 'col-1-2': 5 }]);
        expect(response).toHaveProperty('columns');
        expect(response.columns.length).toEqual(2);
        expect(response.columns[0]).toHaveProperty('id', 'col-0-1');
        expect(response.columns[0]).toHaveProperty('name', 'geo.src: Descending');
        expect(response.columns[0]).toHaveProperty('aggConfig');
        expect(response.columns[1]).toHaveProperty('id', 'col-1-2');
        expect(response.columns[1]).toHaveProperty('name', 'Count');
        expect(response.columns[1]).toHaveProperty('aggConfig');
      });

      test('produces correct response for no data', () => {
        const response = responseWriter.response();

        expect(response).toHaveProperty('rows');
        expect(response.rows.length).toBe(0);
        expect(response).toHaveProperty('columns');
        expect(response.columns.length).toEqual(2);
        expect(response.columns[0]).toHaveProperty('id', 'col-0-1');
        expect(response.columns[0]).toHaveProperty('name', 'geo.src: Descending');
        expect(response.columns[0]).toHaveProperty('aggConfig');
        expect(response.columns[1]).toHaveProperty('id', 'col-1-2');
        expect(response.columns[1]).toHaveProperty('name', 'Count');
        expect(response.columns[1]).toHaveProperty('aggConfig');
      });
    });
  });
});
