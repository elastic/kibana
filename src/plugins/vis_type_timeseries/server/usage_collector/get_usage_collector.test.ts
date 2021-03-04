/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStats } from './get_usage_collector';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';
import { TIME_RANGE_DATA_MODES } from '../../common/timerange_data_modes';

const mockedSavedObjects = [
  {
    _id: 'visualization:timeseries-123',
    _source: {
      type: 'visualization',
      visualization: {
        visState: JSON.stringify({
          type: 'metrics',
          title: 'TSVB visualization 1',
          params: {
            time_range_mode: TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
          },
        }),
      },
    },
  },
  {
    _id: 'visualization:timeseries-321',
    _source: {
      type: 'visualization',
      visualization: {
        visState: JSON.stringify({
          type: 'metrics',
          title: 'TSVB visualization 2',
          params: {
            time_range_mode: TIME_RANGE_DATA_MODES.LAST_VALUE,
          },
        }),
      },
    },
  },
];

const getMockCollectorFetchContext = (hits?: unknown[]) => {
  const fetchParamsMock = createCollectorFetchContextMock();

  fetchParamsMock.esClient.search = jest.fn().mockResolvedValue({ body: { hits: { hits } } });
  return fetchParamsMock;
};

describe('Timelion visualization usage collector', () => {
  const mockIndex = 'mock_index';

  test('Returns undefined when no results found (undefined)', async () => {
    const result = await getStats(getMockCollectorFetchContext().esClient, mockIndex);

    expect(result).toBeUndefined();
  });

  test('Returns undefined when no results found (0 results)', async () => {
    const result = await getStats(getMockCollectorFetchContext([]).esClient, mockIndex);

    expect(result).toBeUndefined();
  });

  test('Returns undefined when no TSVB saved objects found', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext([
      {
        _id: 'visualization:myvis-123',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "area"}' },
        },
      },
    ]);
    const result = await getStats(mockCollectorFetchContext.esClient, mockIndex);

    expect(result).toBeUndefined();
  });

  test('Summarizes visualizations response data', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext(mockedSavedObjects);
    const result = await getStats(mockCollectorFetchContext.esClient, mockIndex);

    expect(result).toMatchObject({
      timeseries_use_last_value_mode_total: 1,
    });
  });
});
