/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { EpochTimeRange } from '../../types';
import type { MetricField } from '../../../common/types';
import { getMetricFields } from './get_metric_fields';
import { retrieveFieldCaps } from '../../lib/fields/retrieve_fieldcaps';
import { applyPagination } from '../../lib/pagination/apply_pagination';

jest.mock('../../lib/fields/retrieve_fieldcaps');
jest.mock('../../lib/pagination/apply_pagination');

const mockRetrieveFieldCaps = retrieveFieldCaps as jest.MockedFunction<typeof retrieveFieldCaps>;
const mockApplyPagination = applyPagination as jest.MockedFunction<typeof applyPagination>;

describe('getMetricFields', () => {
  let logger: Logger;
  let mockEsClient: TracedElasticsearchClient;
  let timerange: EpochTimeRange;

  // Test data constants - complete field definitions
  const TEST_FIELDS = {
    METRIC_A_INDEX_A: {
      name: 'metric.a',
      type: 'long',
      index: 'metrics-a-default',
      instrument: 'counter',
    },
    METRIC_Z_INDEX_A: {
      name: 'metric.z',
      type: 'long',
      index: 'metrics-a-default',
      instrument: 'counter',
    },
    METRIC_Z_INDEX_B: {
      name: 'metric.z',
      type: 'double',
      index: 'metrics-b-default',
      instrument: 'gauge',
    },
  } as const;

  const createMockFieldCapability = (
    type: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    time_series_metric?: 'gauge' | 'counter'
  ): FieldCapsFieldCapability => ({
    type,
    searchable: true,
    aggregatable: true,
    time_series_metric,
  });

  const createMockField = (
    name: string,
    index: string,
    type: string,
    instrument?: 'counter' | 'gauge'
  ): MetricField => ({
    name,
    index,
    dimensions: [],
    type,
    instrument,
  });

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    mockEsClient = { client: {} as any } as TracedElasticsearchClient;
    timerange = { from: 1234567890, to: 1234567900 };
    jest.clearAllMocks();
  });

  it('should sort fields alphabetically by index and name', async () => {
    const mockDataStreamFieldCapsMap = new Map<
      string,
      Record<string, Record<string, FieldCapsFieldCapability>>
    >([
      [
        TEST_FIELDS.METRIC_Z_INDEX_B.index,
        {
          [TEST_FIELDS.METRIC_Z_INDEX_B.name]: {
            [TEST_FIELDS.METRIC_Z_INDEX_B.type]: createMockFieldCapability(
              TEST_FIELDS.METRIC_Z_INDEX_B.type,
              TEST_FIELDS.METRIC_Z_INDEX_B.instrument
            ),
          },
        },
      ],
      [
        TEST_FIELDS.METRIC_A_INDEX_A.index,
        {
          [TEST_FIELDS.METRIC_Z_INDEX_A.name]: {
            [TEST_FIELDS.METRIC_Z_INDEX_A.type]: createMockFieldCapability(
              TEST_FIELDS.METRIC_Z_INDEX_A.type,
              TEST_FIELDS.METRIC_Z_INDEX_A.instrument
            ),
          },
          [TEST_FIELDS.METRIC_A_INDEX_A.name]: {
            [TEST_FIELDS.METRIC_A_INDEX_A.type]: createMockFieldCapability(
              TEST_FIELDS.METRIC_A_INDEX_A.type,
              TEST_FIELDS.METRIC_A_INDEX_A.instrument
            ),
          },
        },
      ],
    ]);

    const field1 = createMockField(
      TEST_FIELDS.METRIC_A_INDEX_A.name,
      TEST_FIELDS.METRIC_A_INDEX_A.index,
      TEST_FIELDS.METRIC_A_INDEX_A.type,
      TEST_FIELDS.METRIC_A_INDEX_A.instrument
    );
    const field2 = createMockField(
      TEST_FIELDS.METRIC_Z_INDEX_A.name,
      TEST_FIELDS.METRIC_Z_INDEX_A.index,
      TEST_FIELDS.METRIC_Z_INDEX_A.type,
      TEST_FIELDS.METRIC_Z_INDEX_A.instrument
    );
    const field3 = createMockField(
      TEST_FIELDS.METRIC_Z_INDEX_B.name,
      TEST_FIELDS.METRIC_Z_INDEX_B.index,
      TEST_FIELDS.METRIC_Z_INDEX_B.type,
      TEST_FIELDS.METRIC_Z_INDEX_B.instrument
    );

    mockRetrieveFieldCaps.mockResolvedValue(mockDataStreamFieldCapsMap);
    mockApplyPagination.mockReturnValue([field1, field2, field3]);

    const result = await getMetricFields({
      esClient: mockEsClient,
      indexPattern: 'metrics-*',
      timerange,
      page: 1,
      size: 10,
      logger,
    });

    expect(mockApplyPagination).toHaveBeenCalledWith(
      expect.objectContaining({
        metricFields: [field1, field2, field3],
      })
    );

    expect(result.fields).toEqual([
      expect.objectContaining(field1),
      expect.objectContaining(field2),
      expect.objectContaining(field3),
    ]);
  });
});
