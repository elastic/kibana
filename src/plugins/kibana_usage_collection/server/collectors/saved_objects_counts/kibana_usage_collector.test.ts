/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '../../../../../core/server/mocks';
import {
  Collector,
  createCollectorFetchContextMock,
  createUsageCollectionSetupMock,
} from '../../../../usage_collection/server/mocks';
import { getKibanaSavedObjectCounts, registerKibanaUsageCollector } from './kibana_usage_collector';

const logger = loggingSystemMock.createLogger();

describe('kibana_usage', () => {
  let collector: Collector<unknown>;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
    collector = new Collector(logger, config);
    return createUsageCollectionSetupMock().makeUsageCollector(config);
  });

  const kibanaIndex = '.kibana-tests';

  const getMockFetchClients = (hits?: unknown[]) => {
    const fetchParamsMock = createCollectorFetchContextMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    // @ts-expect-error for the sake of the tests, we only require `hits`
    esClient.search.mockResponse({ hits: { hits } });
    fetchParamsMock.esClient = esClient;
    return fetchParamsMock;
  };

  beforeAll(() => registerKibanaUsageCollector(usageCollectionMock, kibanaIndex));
  afterAll(() => jest.clearAllTimers());

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
    expect(collector.type).toBe('kibana');
  });

  test('fetch', async () => {
    expect(await collector.fetch(getMockFetchClients())).toStrictEqual({
      index: '.kibana-tests',
      dashboard: { total: 0 },
      visualization: { total: 0 },
      search: { total: 0 },
      index_pattern: { total: 0 },
      graph_workspace: { total: 0 },
    });
  });
});

function mockGetSavedObjectsCounts<TBody>(params: TBody) {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
  esClient.search.mockResponse(
    // @ts-expect-error we only care about the response body
    { ...params }
  );
  return esClient;
}

describe('getKibanaSavedObjectCounts', () => {
  test('Get all the saved objects equal to 0 because no results were found', async () => {
    const esClient = mockGetSavedObjectsCounts({});

    const results = await getKibanaSavedObjectCounts(esClient, '.kibana');
    expect(results).toStrictEqual({
      dashboard: { total: 0 },
      visualization: { total: 0 },
      search: { total: 0 },
      index_pattern: { total: 0 },
      graph_workspace: { total: 0 },
    });
  });

  test('Merge the zeros with the results', async () => {
    const esClient = mockGetSavedObjectsCounts({
      aggregations: {
        types: {
          buckets: [
            { key: 'dashboard', doc_count: 1 },
            { key: 'index-pattern', value: 2 }, // Malformed on purpose
            { key: 'graph_workspace', doc_count: 3 }, // already snake_cased
          ],
        },
      },
    });

    const results = await getKibanaSavedObjectCounts(esClient, '.kibana');
    expect(results).toStrictEqual({
      dashboard: { total: 1 },
      visualization: { total: 0 },
      search: { total: 0 },
      index_pattern: { total: 0 },
      graph_workspace: { total: 3 },
    });
  });
});
