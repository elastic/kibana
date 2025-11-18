/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { enrichMetricFields } from './enrich_metric_fields';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type { IndexFieldCapsMap, EpochTimeRange } from '../../types';
import type { MetricField, DimensionFilters } from '../../../common/types';
import { extractDimensions } from '../dimensions/extract_dimensions';
import type { Logger } from '@kbn/core/server';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import { normalizeUnit } from './normalize_unit';
import type { estypes } from '@elastic/elasticsearch';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { termsQuery } from '@kbn/es-query';
jest.mock('../dimensions/extract_dimensions');
jest.mock('./normalize_unit');

const extractDimensionsMock = extractDimensions as jest.MockedFunction<typeof extractDimensions>;
const msearchMock = jest.fn() as jest.MockedFunction<TracedElasticsearchClient['msearch']>;
const esClientMock = { msearch: msearchMock } as unknown as TracedElasticsearchClient;
const normalizeUnitMock = normalizeUnit as jest.MockedFunction<typeof normalizeUnit>;
const timeRangeFixture: EpochTimeRange = { from: Date.now() - 300_000, to: Date.now() };

describe('enrichMetricFields', () => {
  let logger: Logger;
  let indexFieldCapsMap: IndexFieldCapsMap;

  const TEST_METRIC_NAME = 'system.cpu.utilization';
  const TEST_INDEX_METRICS = 'metrics-*';
  const TEST_INDEX_METRICBEAT = 'metricbeat*';
  const TEST_HOST_FIELD = 'host.name';
  const TEST_HOST_VALUE = 'host-1';

  const createMetricField = (
    name: string = TEST_METRIC_NAME,
    index: string = TEST_INDEX_METRICS,
    overrides: Partial<MetricField> = {}
  ): MetricField => ({
    name,
    index,
    type: 'long',
    dimensions: [{ name: TEST_HOST_FIELD, type: ES_FIELD_TYPES.KEYWORD }],
    ...overrides,
  });

  const createMsearchResponse = (
    index: string,
    fields: Record<string, string[]> = {},
    totalHits: number = 1
  ) => ({
    responses: [
      {
        hits: {
          hits: totalHits > 0 ? [{ fields, _index: index, _source: {} }] : [],
          total: { value: totalHits, relation: 'eq' as const },
        },
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        took: 1,
        timed_out: false,
      },
    ],
  });

  const createFieldCaps = (
    fieldName: string = TEST_HOST_FIELD,
    type: ES_FIELD_TYPES = ES_FIELD_TYPES.KEYWORD
  ): Record<string, Record<string, FieldCapsFieldCapability>> => ({
    [fieldName]: {
      [type]: { time_series_dimension: true, meta: {}, type } as FieldCapsFieldCapability,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    logger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as Logger;

    indexFieldCapsMap = new Map();
    extractDimensionsMock.mockImplementation(
      (_caps, names) => names?.map((name) => ({ name, type: ES_FIELD_TYPES.KEYWORD })) ?? []
    );
  });

  describe('basic functionality', () => {
    it('returns empty array when metricFields is empty', async () => {
      const result = await enrichMetricFields({
        esClient: esClientMock,
        metricFields: [],
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
      });
      expect(result).toEqual([]);
    });
  });

  describe('data availability', () => {
    const testCases = [
      {
        description: 'marks noData true when no sample docs exist',
        mockResponse: createMsearchResponse(TEST_INDEX_METRICS, {}, 0),
        expectedResult: {
          dimensions: [],
          index: TEST_INDEX_METRICS,
          name: TEST_METRIC_NAME,
          noData: true,
          type: 'long',
        },
      },
      {
        description: 'marks noData false when sample docs exist',
        mockResponse: createMsearchResponse(TEST_INDEX_METRICS, {
          [TEST_HOST_FIELD]: [TEST_HOST_VALUE],
        }),
        setupFieldCaps: true,
        expectedResult: {
          index: TEST_INDEX_METRICS,
          name: TEST_METRIC_NAME,
          noData: false,
          dimensions: [{ name: TEST_HOST_FIELD, type: 'keyword' }],
        },
      },
    ];

    testCases.forEach(({ description, mockResponse, setupFieldCaps, expectedResult }) => {
      it(description, async () => {
        const metricFields = [createMetricField()];
        msearchMock.mockResolvedValue(mockResponse);

        if (setupFieldCaps) {
          indexFieldCapsMap.set(TEST_INDEX_METRICS, createFieldCaps());
        }

        const result = await enrichMetricFields({
          esClient: esClientMock,
          metricFields,
          indexFieldCapsMap,
          logger,
          timerange: timeRangeFixture,
        });

        expect(result[0]).toMatchObject(expectedResult);
      });
    });

    it('should return duplicate fields from different indices', async () => {
      const metricFields = [
        createMetricField(),
        createMetricField(TEST_METRIC_NAME, TEST_INDEX_METRICBEAT),
      ];

      msearchMock.mockResolvedValue({
        responses: [
          ...createMsearchResponse(TEST_INDEX_METRICS, { [TEST_HOST_FIELD]: [TEST_HOST_VALUE] })
            .responses,
          ...createMsearchResponse(TEST_INDEX_METRICBEAT, {}).responses,
        ],
      });

      indexFieldCapsMap.set(TEST_INDEX_METRICS, createFieldCaps());
      indexFieldCapsMap.set(TEST_INDEX_METRICBEAT, createFieldCaps());

      const result = await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
      });

      expect(result).toMatchObject([
        {
          dimensions: [
            {
              name: TEST_HOST_FIELD,
              type: 'keyword',
            },
          ],
          index: TEST_INDEX_METRICS,
          name: 'system.cpu.utilization',
          type: 'long',
          noData: false,
        },
        {
          dimensions: [],
          index: TEST_INDEX_METRICBEAT,
          name: 'system.cpu.utilization',
          type: 'long',
          noData: false,
        },
      ]);
    });
  });

  describe('dimension filters', () => {
    it('handles empty filters object', async () => {
      const metricFields = [createMetricField()];
      const filters: DimensionFilters = {};

      msearchMock.mockResolvedValue(
        createMsearchResponse(TEST_INDEX_METRICS, { [TEST_HOST_FIELD]: [TEST_HOST_VALUE] })
      );

      indexFieldCapsMap.set(TEST_INDEX_METRICS, createFieldCaps());

      await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
        filters,
      });

      const msearchCall = msearchMock.mock.calls[0][1];
      const body = msearchCall?.body as NonNullable<Array<estypes.SearchRequest>>;

      const queryFilter = body[1].query?.bool?.filter;
      expect(queryFilter).toEqual(
        expect.arrayContaining([
          { exists: { field: TEST_METRIC_NAME } },
          expect.objectContaining({ range: expect.any(Object) }),
        ])
      );

      expect(queryFilter).toHaveLength(2);
    });

    it('applies single dimension filter with single value', async () => {
      const metricFields = [createMetricField()];
      const filters: DimensionFilters = {
        [TEST_HOST_FIELD]: [TEST_HOST_VALUE],
      };

      msearchMock.mockResolvedValue(
        createMsearchResponse(TEST_INDEX_METRICS, { [TEST_HOST_FIELD]: [TEST_HOST_VALUE] })
      );

      indexFieldCapsMap.set(TEST_INDEX_METRICS, createFieldCaps());

      await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
        filters,
      });

      const msearchCall = msearchMock.mock.calls[0][1];
      const body = msearchCall?.body as NonNullable<Array<estypes.SearchRequest>>;

      expect(body[0]).toEqual({ index: TEST_INDEX_METRICS });
      expect(body[1]?.query?.bool?.filter).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            bool: expect.objectContaining({
              should: expect.arrayContaining([...termsQuery(TEST_HOST_FIELD, [TEST_HOST_VALUE])]),
            }),
          }),
        ])
      );
    });

    it('applies single dimension filter with multiple values', async () => {
      const metricFields = [createMetricField()];
      const filters: DimensionFilters = {
        [TEST_HOST_FIELD]: ['host-1', 'host-2', 'host-3'],
      };

      msearchMock.mockResolvedValue(
        createMsearchResponse(TEST_INDEX_METRICS, { [TEST_HOST_FIELD]: [TEST_HOST_VALUE] })
      );

      indexFieldCapsMap.set(TEST_INDEX_METRICS, createFieldCaps());

      await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
        filters,
      });

      const msearchCall = msearchMock.mock.calls[0][1];
      const body = msearchCall?.body as NonNullable<Array<estypes.SearchRequest>>;

      expect(body[0]).toEqual({ index: TEST_INDEX_METRICS });
      expect(body[1]?.query?.bool?.filter).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            bool: expect.objectContaining({
              should: expect.arrayContaining([
                ...termsQuery(TEST_HOST_FIELD, ['host-1', 'host-2', 'host-3']),
              ]),
            }),
          }),
        ])
      );
    });

    it('applies multiple dimension filters with mapping mismatch', async () => {
      const metricFields = [
        createMetricField(TEST_METRIC_NAME, TEST_INDEX_METRICS, {
          dimensions: [{ name: 'attribute.cpu', type: ES_FIELD_TYPES.KEYWORD }],
        }),
        createMetricField(TEST_METRIC_NAME, TEST_INDEX_METRICBEAT, {
          dimensions: [{ name: 'attribute.cpu', type: ES_FIELD_TYPES.LONG }],
        }),
      ];

      const filters: DimensionFilters = {
        'attribute.cpu': ['1', '2', 'cpu0', 'cpu1'],
      };

      msearchMock.mockResolvedValue({
        responses: [
          ...createMsearchResponse(TEST_INDEX_METRICS, {
            'attribute.cpu': ['cpu0', 'cpu1'],
          }).responses,
          ...createMsearchResponse(TEST_INDEX_METRICBEAT, {
            'attribute.cpu': ['1', '2'],
          }).responses,
        ],
      });

      indexFieldCapsMap.set(
        TEST_INDEX_METRICS,
        createFieldCaps('attribute.cpu', ES_FIELD_TYPES.KEYWORD)
      );
      indexFieldCapsMap.set(
        TEST_INDEX_METRICBEAT,
        createFieldCaps('attribute.cpu', ES_FIELD_TYPES.LONG)
      );

      await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
        filters,
      });

      const msearchCall = msearchMock.mock.calls[0][1];
      const body = msearchCall?.body as NonNullable<Array<estypes.SearchRequest>>;

      expect(body).toHaveLength(4);

      expect(body[0]).toEqual({ index: TEST_INDEX_METRICS });
      expect(body[1]?.query?.bool?.filter).toEqual(
        expect.arrayContaining([
          { exists: { field: 'system.cpu.utilization' } },
          expect.objectContaining({
            bool: expect.objectContaining({
              should: expect.arrayContaining([
                { terms: { 'attribute.cpu': ['1', '2', 'cpu0', 'cpu1'] } },
              ]),
            }),
          }),
        ])
      );

      expect(body[2]).toEqual({ index: TEST_INDEX_METRICBEAT });
      expect(body[3]?.query?.bool?.filter).toEqual(
        expect.arrayContaining([
          { exists: { field: 'system.cpu.utilization' } },
          expect.objectContaining({
            bool: expect.objectContaining({
              should: expect.arrayContaining([{ terms: { 'attribute.cpu': [1, 2] } }]),
            }),
          }),
        ])
      );
    });
  });

  describe('unit normalization', () => {
    it('normalizes unit from sample docs', async () => {
      const metricFields = [createMetricField()];
      normalizeUnitMock.mockReturnValue('percent');

      msearchMock.mockResolvedValue(
        createMsearchResponse(TEST_INDEX_METRICS, {
          [TEST_HOST_FIELD]: [TEST_HOST_VALUE],
          unit: ['1'],
        })
      );
      indexFieldCapsMap.set(TEST_INDEX_METRICS, createFieldCaps());

      const result = await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
      });

      expect(normalizeUnitMock).toHaveBeenCalledWith({
        fieldName: TEST_METRIC_NAME,
        unit: '1',
      });

      expect(result).toEqual([
        expect.objectContaining({
          unit: 'percent',
        }),
      ]);
    });

    it('preserves unit from field caps', async () => {
      const metricFields = [
        createMetricField(TEST_METRIC_NAME, TEST_INDEX_METRICS, { unit: 'ms' }),
      ];

      normalizeUnitMock.mockReturnValue('ms');

      msearchMock.mockResolvedValue(
        createMsearchResponse(TEST_INDEX_METRICS, { [TEST_HOST_FIELD]: [TEST_HOST_VALUE] })
      );
      indexFieldCapsMap.set(TEST_INDEX_METRICS, createFieldCaps());

      const result = await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
      });

      expect(normalizeUnitMock).toHaveBeenCalledWith({
        fieldName: TEST_METRIC_NAME,
        unit: 'ms',
      });

      expect(result).toEqual([
        expect.objectContaining({
          unit: 'ms',
        }),
      ]);
    });
  });
});
