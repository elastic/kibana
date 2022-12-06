/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import {
  Collector,
  createCollectorFetchContextMock,
  createUsageCollectionSetupMock,
} from '@kbn/usage-collection-plugin/server/mocks';
import { getSavedObjectsCountsMock } from './saved_objects_count.test.mocks';
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

  beforeAll(() => registerKibanaUsageCollector(usageCollectionMock, kibanaIndex));
  afterAll(() => jest.clearAllTimers());

  afterEach(() => getSavedObjectsCountsMock.mockReset());

  test('registered collector is set', () => {
    expect(collector).not.toBeUndefined();
    expect(collector.type).toBe('kibana');
  });

  test('fetch', async () => {
    getSavedObjectsCountsMock.mockResolvedValueOnce({ total: 0, per_type: [], others: 0 });
    expect(await collector.fetch(createCollectorFetchContextMock())).toStrictEqual({
      index: '.kibana-tests',
      dashboard: { total: 0 },
      visualization: { total: 0 },
      search: { total: 0 },
      index_pattern: { total: 0 },
      graph_workspace: { total: 0 },
    });
  });
});

describe('getKibanaSavedObjectCounts', () => {
  const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

  test('Get all the saved objects equal to 0 because no results were found', async () => {
    getSavedObjectsCountsMock.mockResolvedValueOnce({
      total: 0,
      per_type: [],
      non_expected_types: [],
      others: 0,
    });
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
    getSavedObjectsCountsMock.mockResolvedValueOnce({
      total: 3,
      per_type: [
        { key: 'dashboard', doc_count: 1 },
        { key: 'index-pattern', value: 2 }, // Malformed on purpose
        { key: 'graph_workspace', doc_count: 3 }, // already snake_cased
      ],
      non_expected_types: [],
      others: 0,
    });

    const results = await getKibanaSavedObjectCounts(esClient, '.kibana');
    expect(results).toStrictEqual({
      dashboard: { total: 1 },
      visualization: { total: 0 },
      search: { total: 0 },
      index_pattern: { total: 0 },
      graph_workspace: { total: 3 },
    });

    expect(getSavedObjectsCountsMock).toHaveBeenCalledWith(
      esClient,
      '.kibana',
      ['dashboard', 'visualization', 'search', 'index-pattern', 'graph-workspace'],
      true
    );
  });
});
