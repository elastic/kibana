/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStats } from './get_usage_collector';
import { createCollectorFetchContextMock } from '../../../../usage_collection/server/mocks';
import type {
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '../../../../../core/server';
import { TIME_RANGE_DATA_MODES } from '../../common/enums';

const mockedSavedObject = {
  saved_objects: [
    {
      attributes: {
        visState: JSON.stringify({
          type: 'metrics',
          title: 'TSVB visualization 1',
          params: {
            type: 'gauge',
            time_range_mode: TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
            use_kibana_indexes: true,
          },
        }),
      },
    },
    {
      attributes: {
        visState: JSON.stringify({
          type: 'metrics',
          title: 'TSVB visualization 2',
          params: {
            type: 'top_n',
            time_range_mode: TIME_RANGE_DATA_MODES.LAST_VALUE,
            use_kibana_indexes: false,
          },
        }),
      },
    },
    {
      attributes: {
        visState: JSON.stringify({
          type: 'metrics',
          title: 'TSVB visualization 3',
          params: {
            type: 'markdown',
            time_range_mode: undefined,
            use_kibana_indexes: false,
          },
        }),
      },
    },
    {
      attributes: {
        visState: JSON.stringify({
          type: 'metrics',
          title: 'TSVB visualization 4',
          params: {
            type: 'table',
            series: [
              {
                aggregate_by: 'test',
                aggregate_function: 'max',
              },
            ],
          },
        }),
      },
    },
  ],
} as SavedObjectsFindResponse;

const mockedSavedObjectsByValue = [
  {
    attributes: {
      panelsJSON: JSON.stringify({
        type: 'visualization',
        embeddableConfig: {
          savedVis: {
            type: 'metrics',
            params: {
              type: 'markdown',
              time_range_mode: TIME_RANGE_DATA_MODES.LAST_VALUE,
              use_kibana_indexes: false,
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
              type: 'timeseries',
              time_range_mode: TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
              use_kibana_indexes: true,
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
              type: 'table',
              series: [
                {
                  aggregate_by: 'test1',
                  aggregate_function: 'sum',
                },
              ],
              use_kibana_indexes: true,
            },
          },
        },
      }),
    },
  },
];

const getMockCollectorFetchContext = (
  savedObjects: SavedObjectsFindResponse,
  savedObjectsByValue: unknown[] = []
) => {
  const fetchParamsMock = createCollectorFetchContextMock();

  fetchParamsMock.soClient = {
    find: jest.fn().mockResolvedValue({
      saved_objects: savedObjectsByValue,
    }),
    createPointInTimeFinder: jest.fn().mockResolvedValue({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield savedObjects;
      },
    }),
  } as unknown as SavedObjectsClientContract;
  return fetchParamsMock;
};

describe('Timeseries visualization usage collector', () => {
  test('Returns undefined when no results found (undefined)', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext(
      { saved_objects: [] } as unknown as SavedObjectsFindResponse,
      []
    );
    const result = await getStats(mockCollectorFetchContext.soClient);

    expect(result).toBeUndefined();
  });

  test('Returns undefined when no timeseries saved objects found', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext({
      saved_objects: [
        {
          attributes: { visState: '{"type": "area"}' },
        },
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
      ],
    } as SavedObjectsFindResponse);

    const result = await getStats(mockCollectorFetchContext.soClient);

    expect(result).toBeUndefined();
  });

  test('Returns undefined when aggregate function is null', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext({
      saved_objects: [
        {
          attributes: {
            panelsJSON: JSON.stringify({
              type: 'visualization',
              embeddableConfig: {
                savedVis: {
                  type: 'metrics',
                  params: {
                    type: 'table',
                    series: [
                      {
                        aggregate_by: null,
                        aggregate_function: null,
                      },
                    ],
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
                    type: 'table',
                    series: [
                      {
                        axis_position: 'right',
                      },
                    ],
                  },
                },
              },
            }),
          },
        },
      ],
    } as SavedObjectsFindResponse);

    const result = await getStats(mockCollectorFetchContext.soClient);

    expect(result).toBeUndefined();
  });

  test('Summarizes visualizations response data', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext(
      mockedSavedObject,
      mockedSavedObjectsByValue
    );
    const result = await getStats(mockCollectorFetchContext.soClient);

    expect(result).toStrictEqual({
      timeseries_use_last_value_mode_total: 5,
      timeseries_use_es_indices_total: 4,
      timeseries_table_use_aggregate_function: 2,
      timeseries_types: {
        gauge: 1,
        markdown: 2,
        metric: 0,
        table: 2,
        timeseries: 1,
        top_n: 1,
      },
    });
  });
});
