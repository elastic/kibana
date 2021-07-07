/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStats } from './get_usage_collector';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';
import { TIME_RANGE_DATA_MODES } from '../../common/enums';

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
  {
    _id: 'visualization:timeseries-456',
    _source: {
      type: 'visualization',
      visualization: {
        visState: JSON.stringify({
          type: 'metrics',
          title: 'TSVB visualization 3',
          params: {
            time_range_mode: undefined,
          },
        }),
      },
    },
  },
];

const mockedSavedObjectsByValue = [
  {
    attributes: {
      panelsJSON: JSON.stringify({
        type: 'visualization',
        embeddableConfig: {
          savedVis: {
            type: 'metrics',
            params: {
              time_range_mode: TIME_RANGE_DATA_MODES.LAST_VALUE,
            },
          },
        },
      }),
    },
  },
  {
    attributes: {
      panelsJSON: JSON.stringify({
        type: 'visualization',
        embeddableConfig: {
          savedVis: {
            type: 'metrics',
            params: {
              time_range_mode: TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
            },
          },
        },
      }),
    },
  },
];

const getMockCollectorFetchContext = (hits?: unknown[], savedObjectsByValue: unknown[] = []) => {
  const fetchParamsMock = createCollectorFetchContextMock();

  fetchParamsMock.esClient.search = jest.fn().mockResolvedValue({ body: { hits: { hits } } });
  fetchParamsMock.soClient.find = jest.fn().mockResolvedValue({
    saved_objects: savedObjectsByValue,
  });
  return fetchParamsMock;
};

describe('Timeseries visualization usage collector', () => {
  const mockIndex = 'mock_index';

  test('Returns undefined when no results found (undefined)', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext([], []);
    const result = await getStats(
      mockCollectorFetchContext.esClient,
      mockCollectorFetchContext.soClient,
      mockIndex
    );

    expect(result).toBeUndefined();
  });

  test('Returns undefined when no timeseries saved objects found', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext(
      [
        {
          _id: 'visualization:myvis-123',
          _source: {
            type: 'visualization',
            visualization: { visState: '{"type": "area"}' },
          },
        },
      ],
      [
        {
          attributes: {
            panelsJSON: JSON.stringify({
              type: 'visualization',
              embeddableConfig: {
                savedVis: {
                  type: 'area',
                },
              },
            }),
          },
        },
      ]
    );
    const result = await getStats(
      mockCollectorFetchContext.esClient,
      mockCollectorFetchContext.soClient,
      mockIndex
    );

    expect(result).toBeUndefined();
  });

  test('Summarizes visualizations response data', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext(
      mockedSavedObjects,
      mockedSavedObjectsByValue
    );
    const result = await getStats(
      mockCollectorFetchContext.esClient,
      mockCollectorFetchContext.soClient,
      mockIndex
    );

    expect(result).toMatchObject({
      timeseries_use_last_value_mode_total: 3,
    });
  });
});
