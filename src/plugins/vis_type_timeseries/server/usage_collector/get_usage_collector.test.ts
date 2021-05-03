/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStats } from './get_usage_collector';
import { createCollectorFetchContextMock } from '../../../usage_collection/server/mocks';
import { TIME_RANGE_DATA_MODES } from '../../common/timerange_data_modes';
import type { SavedObjectsClientContract, SavedObjectsFindResponse } from '../../../../core/server';

const mockedSavedObject = {
  saved_objects: [
    {
      attributes: {
        visState: JSON.stringify({
          type: 'metrics',
          title: 'TSVB visualization 1',
          params: {
            time_range_mode: TIME_RANGE_DATA_MODES.ENTIRE_TIME_RANGE,
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
            time_range_mode: TIME_RANGE_DATA_MODES.LAST_VALUE,
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
            time_range_mode: undefined,
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

const getMockCollectorFetchContext = (
  savedObjects: SavedObjectsFindResponse,
  savedObjectsByValue: unknown[] = []
) => {
  const fetchParamsMock = createCollectorFetchContextMock();

  fetchParamsMock.soClient = ({
    find: jest.fn().mockResolvedValue({
      saved_objects: savedObjectsByValue,
    }),
    createPointInTimeFinder: jest.fn().mockResolvedValue({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield savedObjects;
      },
    }),
  } as unknown) as SavedObjectsClientContract;
  return fetchParamsMock;
};

describe('Timeseries visualization usage collector', () => {
  test('Returns undefined when no results found (undefined)', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext(
      ({ saved_objects: [] } as unknown) as SavedObjectsFindResponse,
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

  test('Summarizes visualizations response data', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext(
      mockedSavedObject,
      mockedSavedObjectsByValue
    );
    const result = await getStats(mockCollectorFetchContext.soClient);

    expect(result).toMatchObject({
      timeseries_use_last_value_mode_total: 3,
    });
  });
});
