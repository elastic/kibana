/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStats } from './get_usage_collector';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';

const mockedSavedObjects = [
  {
    _id: 'visualization:timelion-123',
    _source: {
      type: 'visualization',
      visualization: {
        visState: JSON.stringify({
          type: 'timelion',
          title: 'timelion visualization 1',
          params: {
            expression: '.es(index=my-test,metric=avg:scripted-test-field)',
          },
        }),
      },
      updated_at: new Date().toUTCString(),
    },
  },
  {
    _id: 'visualization:timelion-321',
    _source: {
      type: 'visualization',
      visualization: {
        visState: JSON.stringify({
          type: 'timelion',
          title: 'timelion visualization 1',
          params: {
            expression: '.es(index=my-test,metric=avg:scripted-test-field)',
          },
        }),
      },
      updated_at: '2020-10-17T00:00:00',
    },
  },
  {
    _id: 'visualization:timelion-456',
    _source: {
      type: 'visualization',
      visualization: {
        visState: JSON.stringify({
          type: 'timelion',
          title: 'timelion visualization 2',
          params: {
            expression: '.es(index=my-test,metric=avg:test-field)',
          },
        }),
      },
      updated_at: new Date().toUTCString(),
    },
  },
];

const mockedSavedObjectsByValue = [
  {
    id: '1',
    attributes: {
      panelsJSON: JSON.stringify([
        {
          type: 'visualization',
          embeddableConfig: {
            savedVis: {
              type: 'timelion',
              params: {
                expression: '.es(index=my-test,metric=avg:test-field)',
              },
            },
          },
        },
      ]),
    },
    updated_at: new Date().toUTCString(),
  },
  {
    id: '2',
    attributes: {
      panelsJSON: JSON.stringify([
        {
          type: 'visualization',
          embeddableConfig: {
            savedVis: {
              type: 'timelion',
              params: {
                expression: '.es(index=my-test,metric=avg:scripted-test-field)',
              },
            },
          },
        },
      ]),
    },
    updated_at: new Date().toUTCString(),
  },
];

const getMockCollectorFetchContext = (hits?: unknown[], savedObjectsByValue: unknown[] = []) => {
  const fetchParamsMock = createCollectorFetchContextMock();

  fetchParamsMock.esClient.search = jest.fn().mockResolvedValue({ body: { hits: { hits } } });
  fetchParamsMock.soClient.find = jest.fn().mockImplementation(({ type }: { type: string }) => {
    return {
      saved_objects:
        type === 'index-pattern'
          ? [
              {
                attributes: {
                  title: 'my-test',
                  fields: JSON.stringify([{ scripted: true, name: 'scripted-test-field' }]),
                },
              },
            ]
          : savedObjectsByValue,
    };
  });
  return fetchParamsMock;
};

describe('Timelion visualization usage collector', () => {
  const mockIndex = 'mock_index';

  test('Returns undefined when no results found', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext([], []);
    const result = await getStats(
      mockCollectorFetchContext.esClient,
      mockCollectorFetchContext.soClient,
      mockIndex
    );

    expect(result).toBeUndefined();
  });

  test('Returns undefined when no timelion saved objects found', async () => {
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
      timelion_use_scripted_fields_90_days_total: 2,
    });
  });
});
