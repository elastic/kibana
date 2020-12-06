/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { getStats } from './get_usage_collector';
import { HomeServerPluginSetup } from '../../../home/server';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';

const mockedSavedObjects = [
  // vega-lite lib spec
  {
    _id: 'visualization:vega-1',
    _source: {
      type: 'visualization',
      visualization: {
        visState: JSON.stringify({
          type: 'vega',
          params: {
            spec: '{"$schema": "https://vega.github.io/schema/vega-lite/v4.json" }',
          },
        }),
      },
    },
  },
  // vega lib spec
  {
    _id: 'visualization:vega-2',
    _source: {
      type: 'visualization',
      visualization: {
        visState: JSON.stringify({
          type: 'vega',
          params: {
            spec: '{"$schema": "https://vega.github.io/schema/vega/v5.json" }',
          },
        }),
      },
    },
  },
  // map layout
  {
    _id: 'visualization:vega-3',
    _source: {
      type: 'visualization',
      visualization: {
        visState: JSON.stringify({
          type: 'vega',
          params: {
            spec:
              '{"$schema": "https://vega.github.io/schema/vega/v3.json" \n "config": { "kibana" : { "type": "map" }} }',
          },
        }),
      },
    },
  },
];

const getMockCollectorFetchContext = (hits?: unknown[]) => {
  const fetchParamsMock = createCollectorFetchContextMock();
  fetchParamsMock.callCluster.mockResolvedValue({ hits: { hits } });
  return fetchParamsMock;
};

describe('Vega visualization usage collector', () => {
  const mockIndex = 'mock_index';
  const mockDeps = {
    home: ({
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
    } as unknown) as HomeServerPluginSetup,
  };

  test('Returns undefined when no results found (undefined)', async () => {
    const result = await getStats(getMockCollectorFetchContext().callCluster, mockIndex, mockDeps);

    expect(result).toBeUndefined();
  });

  test('Returns undefined when no results found (0 results)', async () => {
    const result = await getStats(
      getMockCollectorFetchContext([]).callCluster,
      mockIndex,
      mockDeps
    );

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
    const result = await getStats(mockCollectorFetchContext.callCluster, mockIndex, mockDeps);

    expect(result).toBeUndefined();
  });

  test('Should ingnore sample data visualizations', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext([
      {
        _id: 'visualization:sampledata-123',
        _source: {
          type: 'visualization',
          visualization: {
            visState: JSON.stringify({
              type: 'vega',
              title: 'sample vega visualization',
              params: {
                spec: '{"$schema": "https://vega.github.io/schema/vega/v5.json" }',
              },
            }),
          },
        },
      },
    ]);

    const result = await getStats(mockCollectorFetchContext.callCluster, mockIndex, mockDeps);

    expect(result).toBeUndefined();
  });

  test('Summarizes visualizations response data', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext(mockedSavedObjects);
    const result = await getStats(mockCollectorFetchContext.callCluster, mockIndex, mockDeps);

    expect(result).toMatchObject({
      vega_lib_specs_total: 2,
      vega_lite_lib_specs_total: 1,
      vega_use_map_total: 1,
    });
  });
});
