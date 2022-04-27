/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStats } from './get_usage_collector';
import { createCollectorFetchContextMock } from '@kbn/usage-collection-plugin/server/mocks';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';

const mockedSavedObjects = [
  // vega-lite lib spec
  {
    attributes: {
      visState: JSON.stringify({
        type: 'vega',
        params: {
          spec: '{"$schema": "https://vega.github.io/schema/vega-lite/v5.json" }',
        },
      }),
    },
  },
  // vega lib spec
  {
    attributes: {
      visState: JSON.stringify({
        type: 'vega',
        params: {
          spec: '{"$schema": "https://vega.github.io/schema/vega/v5.json" }',
        },
      }),
    },
  },
  // map layout
  {
    attributes: {
      visState: JSON.stringify({
        type: 'vega',
        params: {
          spec: '{"$schema": "https://vega.github.io/schema/vega/v3.json" \n "config": { "kibana" : { "type": "map" }} }',
        },
      }),
    },
  },
];

const getMockCollectorFetchContext = (savedObjects?: unknown[]) => {
  const fetchParamsMock = createCollectorFetchContextMock();

  fetchParamsMock.soClient = {
    createPointInTimeFinder: jest.fn().mockResolvedValue({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield { saved_objects: savedObjects };
      },
    }),
  } as unknown as SavedObjectsClientContract;

  return fetchParamsMock;
};

describe('Vega visualization usage collector', () => {
  const mockDeps = {
    home: {
      sampleData: {
        getSampleDatasets: jest.fn().mockReturnValue([
          {
            savedObjects: [
              {
                type: 'visualization',
                attributes: {
                  visState: JSON.stringify({
                    type: 'vega',
                    title: 'sample vega visualization',
                    params: {
                      spec: '{"$schema": "https://vega.github.io/schema/vega/v5.json" }',
                    },
                  }),
                },
              },
            ],
          },
        ]),
      },
    } as unknown as HomeServerPluginSetup,
  };

  test('Returns undefined when no results found (undefined)', async () => {
    const result = await getStats(getMockCollectorFetchContext().soClient, mockDeps);

    expect(result).toBeUndefined();
  });

  test('Returns undefined when no results found (0 results)', async () => {
    const result = await getStats(getMockCollectorFetchContext([]).soClient, mockDeps);

    expect(result).toBeUndefined();
  });

  test('Returns undefined when no vega saved objects found', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext([
      {
        _id: 'visualization:myvis-123',
        _source: {
          type: 'visualization',
          visualization: { visState: '{"type": "area"}' },
        },
      },
    ]);
    const result = await getStats(mockCollectorFetchContext.soClient, mockDeps);

    expect(result).toBeUndefined();
  });

  test('Should ingnore sample data visualizations', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext([
      {
        attributes: {
          visState: JSON.stringify({
            type: 'vega',
            title: 'sample vega visualization',
            params: {
              spec: '{"$schema": "https://vega.github.io/schema/vega/v5.json" }',
            },
          }),
        },
      },
    ]);

    const result = await getStats(mockCollectorFetchContext.soClient, mockDeps);

    expect(result).toBeUndefined();
  });

  test('Summarizes visualizations response data', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext(mockedSavedObjects);
    const result = await getStats(mockCollectorFetchContext.soClient, mockDeps);

    expect(result).toMatchObject({
      vega_lib_specs_total: 2,
      vega_lite_lib_specs_total: 1,
      vega_use_map_total: 1,
    });
  });
});
