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
import { ES_FIELD_TYPES } from '@kbn/field-types';

jest.mock('../dimensions/extract_dimensions');
jest.mock('./normalize_unit');

const extractDimensionsMock = extractDimensions as jest.MockedFunction<typeof extractDimensions>;
const esqlMock = jest.fn() as jest.MockedFunction<TracedElasticsearchClient['esql']>;
const esClientMock = { esql: esqlMock } as unknown as TracedElasticsearchClient;
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

  // Helper to create ES|QL response format
  const createEsqlResponse = (fields: Record<string, any> = {}, totalHits: number = 1) => {
    if (totalHits === 0) {
      return {
        columns: [],
        values: [],
      };
    }

    const columns = Object.keys(fields).map((name) => ({ name, type: 'keyword' }));
    const values = [Object.values(fields)];

    return {
      columns,
      values,
    };
  };

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
    it('marks noData true when no sample docs exist', async () => {
      const metricFields = [createMetricField()];
      esqlMock.mockResolvedValue(createEsqlResponse({}, 0));

      const result = await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
      });

      expect(result[0]).toMatchObject({
        dimensions: [],
        index: TEST_INDEX_METRICS,
        name: TEST_METRIC_NAME,
        noData: true,
        type: 'long',
      });
    });

    it('marks noData false when sample docs exist', async () => {
      const metricFields = [createMetricField()];
      esqlMock.mockResolvedValue(
        createEsqlResponse({
          [TEST_HOST_FIELD]: TEST_HOST_VALUE,
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

      expect(result[0]).toMatchObject({
        index: TEST_INDEX_METRICS,
        name: TEST_METRIC_NAME,
        noData: false,
        dimensions: [{ name: TEST_HOST_FIELD, type: 'keyword' }],
      });
    });

    it('should return duplicate fields from different indices', async () => {
      const metricFields = [
        createMetricField(),
        createMetricField(TEST_METRIC_NAME, TEST_INDEX_METRICBEAT),
      ];

      // Mock responses for both queries
      esqlMock
        .mockResolvedValueOnce(
          createEsqlResponse({
            [TEST_HOST_FIELD]: TEST_HOST_VALUE,
          })
        )
        .mockResolvedValueOnce(createEsqlResponse({}, 0));

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
          noData: true,
        },
      ]);
    });

    it('handles errors gracefully and marks fields as noData', async () => {
      const metricFields = [createMetricField()];
      esqlMock.mockRejectedValue(new Error('ES|QL query failed'));

      const result = await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
      });

      expect(result[0]).toMatchObject({
        dimensions: [],
        noData: true,
      });
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('dimension filters', () => {
    it('handles empty filters object', async () => {
      const metricFields = [createMetricField()];
      const filters: DimensionFilters = {};

      esqlMock.mockResolvedValue(
        createEsqlResponse({
          [TEST_HOST_FIELD]: TEST_HOST_VALUE,
        })
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

      expect(esqlMock).toHaveBeenCalledWith(
        'sample_metrics_documents',
        expect.objectContaining({
          query: expect.stringContaining('FROM'),
        })
      );
    });

    it('applies single dimension filter with single value', async () => {
      const metricFields = [createMetricField()];
      const filters: DimensionFilters = {
        [TEST_HOST_FIELD]: [TEST_HOST_VALUE],
      };

      esqlMock.mockResolvedValue(
        createEsqlResponse({
          [TEST_HOST_FIELD]: TEST_HOST_VALUE,
        })
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

      const esqlCall = esqlMock.mock.calls[0];
      const query = esqlCall[1]?.query as string;

      // Verify the query contains the filter
      expect(query).toContain('WHERE');
      expect(query).toContain(TEST_HOST_FIELD);
    });

    it('applies single dimension filter with multiple values', async () => {
      const metricFields = [createMetricField()];
      const filters: DimensionFilters = {
        [TEST_HOST_FIELD]: ['host-1', 'host-2', 'host-3'],
      };

      esqlMock.mockResolvedValue(
        createEsqlResponse({
          [TEST_HOST_FIELD]: TEST_HOST_VALUE,
        })
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

      const esqlCall = esqlMock.mock.calls[0];
      const query = esqlCall[1]?.query as string;

      // Verify the query contains the filter with IN clause
      expect(query).toContain('WHERE');
      expect(query).toContain(TEST_HOST_FIELD);
      expect(query).toContain('IN');
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

      esqlMock
        .mockResolvedValueOnce(
          createEsqlResponse({
            'attribute.cpu': 'cpu0',
          })
        )
        .mockResolvedValueOnce(
          createEsqlResponse({
            'attribute.cpu': '1',
          })
        );

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

      // Verify both queries were called with filters
      expect(esqlMock).toHaveBeenCalledTimes(2);
      const query1 = (esqlMock.mock.calls[0][1]?.query as string) || '';
      const query2 = (esqlMock.mock.calls[1][1]?.query as string) || '';

      expect(query1).toContain('attribute.cpu');
      expect(query2).toContain('attribute.cpu');
    });
  });

  describe('WHERE clause support', () => {
    it('extracts and applies WHERE clause from ESQL query', async () => {
      const metricFields = [createMetricField()];
      const query = 'FROM metrics-* | WHERE status == "active"';

      esqlMock.mockResolvedValue(
        createEsqlResponse({
          [TEST_HOST_FIELD]: TEST_HOST_VALUE,
        })
      );

      indexFieldCapsMap.set(TEST_INDEX_METRICS, createFieldCaps());

      await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
        query,
      });

      const esqlCall = esqlMock.mock.calls[0];
      const generatedQuery = esqlCall[1]?.query as string;

      // Verify the WHERE clause was extracted and appended
      expect(generatedQuery).toContain('WHERE status == "active"');
    });

    it('combines WHERE clause with dimension filters', async () => {
      const metricFields = [createMetricField()];
      const query = 'FROM metrics-* | WHERE environment == "production"';
      const filters: DimensionFilters = {
        [TEST_HOST_FIELD]: ['host-1'],
      };

      esqlMock.mockResolvedValue(
        createEsqlResponse({
          [TEST_HOST_FIELD]: TEST_HOST_VALUE,
        })
      );

      indexFieldCapsMap.set(TEST_INDEX_METRICS, createFieldCaps());

      await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
        filters,
        query,
      });

      const esqlCall = esqlMock.mock.calls[0];
      const generatedQuery = esqlCall[1]?.query as string;

      // Verify both the dimension filter and WHERE clause are present
      expect(generatedQuery).toContain(TEST_HOST_FIELD);
      expect(generatedQuery).toContain('WHERE environment == "production"');
    });

    it('handles query without WHERE clause', async () => {
      const metricFields = [createMetricField()];
      const query = 'FROM metrics-*';

      esqlMock.mockResolvedValue(
        createEsqlResponse({
          [TEST_HOST_FIELD]: TEST_HOST_VALUE,
        })
      );

      indexFieldCapsMap.set(TEST_INDEX_METRICS, createFieldCaps());

      await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
        query,
      });

      // Should not throw error
      expect(esqlMock).toHaveBeenCalled();
    });
  });

  describe('unit normalization', () => {
    it('normalizes unit from sample docs', async () => {
      const metricFields = [createMetricField()];
      normalizeUnitMock.mockReturnValue('percent');

      esqlMock.mockResolvedValue(
        createEsqlResponse({
          [TEST_HOST_FIELD]: TEST_HOST_VALUE,
          unit: '1',
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

      esqlMock.mockResolvedValue(
        createEsqlResponse({
          [TEST_HOST_FIELD]: TEST_HOST_VALUE,
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
        unit: 'ms',
      });

      expect(result).toEqual([
        expect.objectContaining({
          unit: 'ms',
        }),
      ]);
    });
  });

  describe('batching and concurrency', () => {
    it('processes multiple metrics in batches', async () => {
      // Create 25 metric fields (more than FIELDS_PER_BATCH which is 20)
      const metricFields = Array.from({ length: 25 }, (_, i) =>
        createMetricField(`metric.${i}`, TEST_INDEX_METRICS)
      );

      esqlMock.mockResolvedValue(
        createEsqlResponse({
          [TEST_HOST_FIELD]: TEST_HOST_VALUE,
        })
      );

      indexFieldCapsMap.set(TEST_INDEX_METRICS, createFieldCaps());

      await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
      });

      // All 25 queries should have been executed
      expect(esqlMock).toHaveBeenCalledTimes(25);
    });

    it('handles partial batch failures gracefully', async () => {
      const metricFields = [
        createMetricField('metric.1'),
        createMetricField('metric.2'),
        createMetricField('metric.3'),
      ];

      esqlMock
        .mockResolvedValueOnce(createEsqlResponse({ [TEST_HOST_FIELD]: TEST_HOST_VALUE }))
        .mockRejectedValueOnce(new Error('Query failed'))
        .mockResolvedValueOnce(createEsqlResponse({ [TEST_HOST_FIELD]: TEST_HOST_VALUE }));

      indexFieldCapsMap.set(TEST_INDEX_METRICS, createFieldCaps());

      const result = await enrichMetricFields({
        esClient: esClientMock,
        metricFields,
        indexFieldCapsMap,
        logger,
        timerange: timeRangeFixture,
      });

      // Should return results for all fields
      expect(result).toHaveLength(3);
      expect(result[0].noData).toBe(false);
      expect(result[1].noData).toBe(true); // Failed query
      expect(result[2].noData).toBe(false);
    });
  });
});
