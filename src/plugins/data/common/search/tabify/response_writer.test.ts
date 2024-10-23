/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TabbedAggResponseWriter } from './response_writer';
import { AggConfigs, BUCKET_TYPES, METRIC_TYPES } from '../aggs';
import { mockAggTypesRegistry } from '../aggs/test_helpers';
import type { TabbedResponseWriterOptions } from './types';
import { Datatable } from '@kbn/expressions-plugin/common';

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
    {
      type: METRIC_TYPES.CARDINALITY,
      params: {
        field: 'machine.os.raw',
      },
    },
  ];

  const multipleMetricsAggConfig = [
    {
      type: BUCKET_TYPES.DATE_HISTOGRAM,
      params: {
        field: 'timestamp',
      },
    },
    {
      type: METRIC_TYPES.COUNT,
    },
    {
      type: METRIC_TYPES.MIN,
      params: {
        field: 'timestamp',
      },
    },
    {
      type: METRIC_TYPES.TOP_METRICS,
      params: {
        field: 'geo.src',
      },
    },
    {
      type: METRIC_TYPES.FILTERED_METRIC,
      schema: 'metric',
      params: {
        customBucket: {
          type: 'filter',
          params: {
            filter: { language: 'kuery', query: 'a: b' },
          },
        },
        customMetric: {
          type: METRIC_TYPES.TOP_HITS,
          params: {
            field: 'machine.os.raw',
          },
        },
      },
    },
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
    {
      type: METRIC_TYPES.CARDINALITY,
      params: {
        field: 'machine.os.raw',
      },
    },
  ];

  const createResponseWritter = (aggs: any[] = [], opts?: Partial<TabbedResponseWriterOptions>) => {
    const fields = [
      {
        name: 'geo.src',
        type: 'string',
      },
      {
        name: 'machine.os.raw',
        type: 'string',
      },
      {
        name: 'bytes',
        type: 'number',
      },
      {
        name: 'timestamp',
        type: 'date',
      },
    ];

    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: (name: string) => fields.find((f) => f.name === name),
        filter: () => fields,
      },
      getFormatterForField: () => ({ toJSON: () => '' }),
    } as any;

    return new TabbedAggResponseWriter(
      new AggConfigs(indexPattern, aggs, { typesRegistry }, jest.fn()),
      {
        metricsAtAllLevels: false,
        partialRows: false,
        ...opts,
      }
    );
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

        expect(response).toHaveProperty('type', 'datatable');
        expect(response).toHaveProperty('rows');
        expect(response.rows).toEqual([{ 'col-0-1': 'US', 'col-1-2': 5 }]);
        expect(response).toHaveProperty('columns');
        expect(response.columns.length).toEqual(2);
        expect(response.columns[0]).toHaveProperty('id', 'col-0-1');
        expect(response.columns[0]).toHaveProperty('name', 'geo.src: Descending');
        expect(response.columns[0]).toHaveProperty('meta', {
          index: 'logstash-*',
          params: {
            id: 'terms',
            params: {
              missingBucketLabel: 'Missing',
              otherBucketLabel: 'Other',
            },
          },
          field: 'geo.src',
          source: 'esaggs',
          sourceParams: {
            hasPrecisionError: false,
            enabled: true,
            id: '1',
            indexPatternId: '1234',
            params: {
              field: 'geo.src',
              missingBucket: false,
              missingBucketLabel: 'Missing',
              order: 'desc',
              otherBucket: false,
              otherBucketLabel: 'Other',
              includeIsRegex: true,
              excludeIsRegex: true,
              size: 5,
            },
            type: 'terms',
          },
          type: 'string',
        });

        expect(response.columns[1]).toHaveProperty('id', 'col-1-2');
        expect(response.columns[1]).toHaveProperty('name', 'Unique count of machine.os.raw');
        expect(response.columns[1]).toHaveProperty('meta', {
          index: 'logstash-*',
          field: 'machine.os.raw',
          params: {
            id: 'number',
          },
          source: 'esaggs',
          sourceParams: {
            hasPrecisionError: false,
            appliedTimeRange: undefined,
            enabled: true,
            id: '2',
            indexPatternId: '1234',
            params: {
              field: 'machine.os.raw',
              emptyAsNull: false,
            },
            type: 'cardinality',
          },
          type: 'number',
        });
      });

      test('produces correct response for no data', () => {
        const response = responseWriter.response();
        expect(response).toHaveProperty('type', 'datatable');
        expect(response).toHaveProperty('rows');
        expect(response.rows.length).toBe(0);
        expect(response).toHaveProperty('columns');
        expect(response.columns.length).toEqual(2);
        expect(response.columns[0]).toHaveProperty('id', 'col-0-1');
        expect(response.columns[0]).toHaveProperty('name', 'geo.src: Descending');
        expect(response.columns[0]).toHaveProperty('meta', {
          index: 'logstash-*',
          params: {
            id: 'terms',
            params: {
              missingBucketLabel: 'Missing',
              otherBucketLabel: 'Other',
            },
          },
          field: 'geo.src',
          source: 'esaggs',
          sourceParams: {
            hasPrecisionError: false,
            enabled: true,
            id: '1',
            indexPatternId: '1234',
            params: {
              field: 'geo.src',
              missingBucket: false,
              missingBucketLabel: 'Missing',
              order: 'desc',
              otherBucket: false,
              otherBucketLabel: 'Other',
              size: 5,
              includeIsRegex: true,
              excludeIsRegex: true,
            },
            type: 'terms',
          },
          type: 'string',
        });

        expect(response.columns[1]).toHaveProperty('id', 'col-1-2');
        expect(response.columns[1]).toHaveProperty('name', 'Unique count of machine.os.raw');
        expect(response.columns[1]).toHaveProperty('meta', {
          index: 'logstash-*',
          field: 'machine.os.raw',
          params: {
            id: 'number',
          },
          source: 'esaggs',
          sourceParams: {
            hasPrecisionError: false,
            appliedTimeRange: undefined,
            enabled: true,
            id: '2',
            indexPatternId: '1234',
            params: {
              field: 'machine.os.raw',
              emptyAsNull: false,
            },
            type: 'cardinality',
          },
          type: 'number',
        });
      });

      describe('produces correct column.meta.type', () => {
        let response: Datatable;
        beforeAll(() => {
          response = createResponseWritter(multipleMetricsAggConfig).response();
        });
        test('returns number if getValueType is not defined and field doesnt exist ', () => {
          const countColumn = response.columns.find((column) => column.name === 'Count');
          expect(countColumn?.meta.type).toEqual('number');
        });
        test('returns field type if getValueType is not defined', () => {
          const minColumn = response.columns.find((column) =>
            column.name.includes('Min timestamp')
          );
          expect(minColumn?.meta.type).toEqual('date');
        });
        test('returns field type for top metrics', () => {
          const topMetricsColumn = response.columns.find((column) => column.name.includes('Last'));
          expect(topMetricsColumn?.meta.type).toEqual('string');
        });
        test('returns correct type of the customMetric for filtered metrics', () => {
          const filteredColumn = response.columns.find((column) =>
            column.name.includes('Filtered')
          );
          expect(filteredColumn?.meta.type).toEqual('string');
        });
      });
    });
  });
});
