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
import type { DataStreamFieldCapsMap } from '../../types';
import type { MetricField } from '../../../common/types';
import { extractDimensions } from '../dimensions/extract_dimensions';
import type { Logger } from '@kbn/core/server';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import { normalizeUnit } from './normalize_unit';

jest.mock('../dimensions/extract_dimensions');
jest.mock('./normalize_unit');

const extractDimensionsMock = extractDimensions as jest.MockedFunction<typeof extractDimensions>;
const msearchMock = jest.fn() as jest.MockedFunction<TracedElasticsearchClient['msearch']>;
const esClientMock = { msearch: msearchMock } as unknown as TracedElasticsearchClient;
const normalizeUnitMock = normalizeUnit as jest.MockedFunction<typeof normalizeUnit>;

describe('enrichMetricFields', () => {
  let logger: Logger;
  let dataStreamFieldCapsMap: DataStreamFieldCapsMap;

  const TEST_METRIC_NAME = 'system.cpu.utilization';
  const TEST_INDEX = 'metrics-*';
  const NO_DATA_INDEX = 'metricbeat*';
  const TEST_HOST_FIELD = 'host.name';
  const TEST_HOST_VALUE = 'host-1';

  const createMetricField = (
    name: string = TEST_METRIC_NAME,
    index: string = TEST_INDEX,
    overrides: Partial<MetricField> = {}
  ): MetricField => ({
    name,
    index,
    type: 'long',
    dimensions: [{ name: TEST_HOST_FIELD, type: 'keyword' }],
    ...overrides,
  });

  const createMsearchResponse = (fields: Record<string, string[]> = {}, totalHits: number = 1) => ({
    responses: [
      {
        hits: {
          hits: totalHits > 0 ? [{ fields, _index: TEST_INDEX, _source: {} }] : [],
          total: { value: totalHits, relation: 'eq' as const },
        },
        _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
        took: 1,
        timed_out: false,
      },
    ],
  });

  const createFieldCaps = (
    fieldName: string = TEST_HOST_FIELD
  ): Record<string, Record<string, FieldCapsFieldCapability>> => ({
    [fieldName]: {
      keyword: { time_series_dimension: true, meta: {} } as FieldCapsFieldCapability,
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

    dataStreamFieldCapsMap = new Map();

    extractDimensionsMock.mockImplementation(
      (_caps, names) => names?.map((name) => ({ name, type: 'keyword' })) ?? []
    );
  });

  describe('basic functionality', () => {
    it('returns empty array when metricFields is empty', async () => {
      const result = await enrichMetricFields({
        esClient: esClientMock,
        metricFields: [],
        dataStreamFieldCapsMap,
        logger,
      });
      expect(result).toEqual([]);
    });
  });

  describe('data availability', () => {
    const testCases = [
      {
        description: 'marks noData true when no sample docs exist',
        mockResponse: createMsearchResponse({}, 0),
        expectedResult: {
          dimensions: [],
          index: TEST_INDEX,
          name: TEST_METRIC_NAME,
          noData: true,
          type: 'long',
        },
      },
      {
        description: 'marks noData false when sample docs exist',
        mockResponse: createMsearchResponse({ [TEST_HOST_FIELD]: [TEST_HOST_VALUE] }),
        setupFieldCaps: true,
        expectedResult: {
          name: TEST_METRIC_NAME,
          index: TEST_INDEX,
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
          dataStreamFieldCapsMap.set(TEST_INDEX, createFieldCaps());
        }

        const result = await enrichMetricFields({
          esClient: esClientMock,
          metricFields,
          dataStreamFieldCapsMap,
          logger,
        });

        expect(result[0]).toMatchObject(expectedResult);
      });
    });

    it('should return duplicate fields from different indices', async () => {
      const metricFields = [
        createMetricField(),
        createMetricField(TEST_METRIC_NAME, 'metricbeat*'),
      ];

      msearchMock.mockResolvedValue(
        createMsearchResponse({ [TEST_HOST_FIELD]: [TEST_HOST_VALUE] })
      );

      dataStreamFieldCapsMap.set(TEST_INDEX, createFieldCaps());
      dataStreamFieldCapsMap.set(NO_DATA_INDEX, createFieldCaps());

      const result = await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        dataStreamFieldCapsMap,
        logger,
      });

      expect(result).toMatchObject([
        {
          dimensions: [
            {
              name: TEST_HOST_FIELD,
              type: 'keyword',
            },
          ],
          index: TEST_INDEX,
          name: 'system.cpu.utilization',
          noData: false,
          type: 'long',
        },
        {
          dimensions: [],
          index: NO_DATA_INDEX,
          name: 'system.cpu.utilization',
          noData: true,
          type: 'long',
        },
      ]);
    });
  });

  describe('unit normalization', () => {
    it('normalizes unit from sample docs', async () => {
      const metricFields = [createMetricField()];
      normalizeUnitMock.mockReturnValue('percent');

      msearchMock.mockResolvedValue(
        createMsearchResponse({ [TEST_HOST_FIELD]: [TEST_HOST_VALUE], unit: ['1'] })
      );
      dataStreamFieldCapsMap.set(TEST_INDEX, createFieldCaps());

      const result = await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        dataStreamFieldCapsMap,
        logger,
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
      const metricFields = [createMetricField(TEST_METRIC_NAME, TEST_INDEX, { unit: 'ms' })];

      normalizeUnitMock.mockReturnValue('ms');

      msearchMock.mockResolvedValue(
        createMsearchResponse({ [TEST_HOST_FIELD]: [TEST_HOST_VALUE] })
      );
      dataStreamFieldCapsMap.set(TEST_INDEX, createFieldCaps());

      const result = await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        dataStreamFieldCapsMap,
        logger,
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
