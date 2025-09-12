/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sampleAndProcessMetricFields } from './sample_metric_documents';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type { DataStreamFieldCapsMap } from '../../types';
import type { MetricField } from '../../../common/types';
import { extractDimensions } from '../dimensions/extract_dimensions';
import type { Logger } from '@kbn/core/server';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';

jest.mock('../dimensions/extract_dimensions');

const extractDimensionsMock = extractDimensions as jest.MockedFunction<typeof extractDimensions>;
const msearchMock = jest.fn() as jest.MockedFunction<TracedElasticsearchClient['msearch']>;
const esClientMock = { msearch: msearchMock } as unknown as TracedElasticsearchClient;

describe('sampleAndProcessMetricFields', () => {
  let logger: Logger;
  let dataStreamFieldCapsMap: DataStreamFieldCapsMap;

  const createMetricField = (name: string, index: string): MetricField => ({
    name,
    index,
    type: 'long',
    dimensions: [{ name: 'host.name', type: 'keyword', description: '' }],
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
  });

  it('returns empty array when metricFields is empty', async () => {
    const result = await sampleAndProcessMetricFields({
      esClient: esClientMock,
      metricFields: [],
      dataStreamFieldCapsMap,
      logger,
    });
    expect(result).toEqual([]);
  });

  it('marks noData true and dimensions empty if no sample docs returned', async () => {
    const metricFields = [createMetricField('system.cpu.utilization', 'metrics-*')];

    msearchMock.mockResolvedValue({
      responses: [
        {
          hits: {
            hits: [{ fields: {}, _index: 'metrics-000001', _source: {} }],
            total: { value: 0, relation: 'eq' },
          },
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          took: 1,
          timed_out: false,
        },
      ],
    });

    const result = await sampleAndProcessMetricFields({
      esClient: esClientMock,
      metricFields,
      dataStreamFieldCapsMap,
      logger,
    });

    expect(result).toEqual([
      {
        dimensions: [],
        index: 'metrics-*',
        name: 'system.cpu.utilization',
        noData: true,
        type: 'long',
      },
    ]);
  });

  it('returns metric fields with dimensions when sample docs exist', async () => {
    const metricFields = [createMetricField('system.cpu.utilization', 'metrics-*')];

    msearchMock.mockResolvedValue({
      responses: [
        {
          hits: {
            hits: [{ fields: { 'host.name': ['host-1'] }, _index: 'metrics-000001', _source: {} }],
            total: { value: 1, relation: 'eq' },
          },
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          took: 1,
          timed_out: false,
        },
      ],
    });

    const fieldCaps: Record<string, Record<string, FieldCapsFieldCapability>> = {
      'host.name': {
        keyword: { time_series_dimension: true, meta: {} } as FieldCapsFieldCapability,
      },
    };
    dataStreamFieldCapsMap.set('metrics-*', fieldCaps);

    extractDimensionsMock.mockImplementation(
      (_caps, names) => names?.map((name) => ({ name, type: 'keyword', description: '' })) ?? []
    );

    const result = await sampleAndProcessMetricFields({
      esClient: esClientMock,
      metricFields,
      dataStreamFieldCapsMap,
      logger,
    });

    expect(result[0]).toMatchObject({
      name: 'system.cpu.utilization',
      index: 'metrics-*',
      noData: false,
      dimensions: [{ name: 'host.name', type: 'keyword', description: '' }],
    });
  });
});
