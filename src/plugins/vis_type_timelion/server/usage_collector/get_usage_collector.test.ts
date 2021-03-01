/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getStats } from './get_usage_collector';
import { setIndexPatternsService } from '../services';
import { createCollectorFetchContextMock } from 'src/plugins/usage_collection/server/mocks';
import { IndexPatternsServiceStart } from '../../../../plugins/data/server/index_patterns';

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

const getMockCollectorFetchContext = (hits?: unknown[]) => {
  const fetchParamsMock = createCollectorFetchContextMock();

  fetchParamsMock.esClient.search = jest.fn().mockResolvedValue({ body: { hits: { hits } } });
  return fetchParamsMock;
};

describe('Timelion visualization usage collector', () => {
  const mockIndex = 'mock_index';
  const indexPatternServiceFactory: IndexPatternsServiceStart['indexPatternsServiceFactory'] = ((() => {
    return {
      find: () => [
        { title: 'my-test', getScriptedFields: () => [{ name: 'scripted-test-field' }] },
      ],
    };
  }) as unknown) as IndexPatternsServiceStart['indexPatternsServiceFactory'];
  setIndexPatternsService({
    indexPatternsServiceFactory: indexPatternServiceFactory,
  });

  test('Returns undefined when no results found (undefined)', async () => {
    const result = await getStats(
      getMockCollectorFetchContext().esClient,
      getMockCollectorFetchContext().soClient,
      mockIndex
    );

    expect(result).toBeUndefined();
  });

  test('Returns undefined when no results found (0 results)', async () => {
    const result = await getStats(
      getMockCollectorFetchContext([]).esClient,
      getMockCollectorFetchContext().soClient,
      mockIndex
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
    const result = await getStats(
      mockCollectorFetchContext.esClient,
      mockCollectorFetchContext.soClient,
      mockIndex
    );

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
              type: 'timelion',
              title: 'sample timelion visualization',
              params: {
                expression: '.es(*)',
              },
            }),
          },
        },
      },
    ]);

    const result = await getStats(
      mockCollectorFetchContext.esClient,
      mockCollectorFetchContext.soClient,
      mockIndex
    );

    expect(result).toBeUndefined();
  });

  test('Summarizes visualizations response data', async () => {
    const mockCollectorFetchContext = getMockCollectorFetchContext(mockedSavedObjects);
    const result = await getStats(
      mockCollectorFetchContext.esClient,
      mockCollectorFetchContext.soClient,
      mockIndex
    );

    expect(result).toMatchObject({
      timelion_use_scripted_fields_total: 1,
    });
  });
});
