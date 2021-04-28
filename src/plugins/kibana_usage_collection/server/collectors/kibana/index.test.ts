/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  loggingSystemMock,
  pluginInitializerContextConfigMock,
  elasticsearchServiceMock,
} from '../../../../../core/server/mocks';
import {
  Collector,
  createCollectorFetchContextMock,
  createUsageCollectionSetupMock,
} from '../../../../usage_collection/server/mocks';
import { registerKibanaUsageCollector } from './';

const logger = loggingSystemMock.createLogger();

describe('telemetry_kibana', () => {
  let collector: Collector<unknown>;

  const usageCollectionMock = createUsageCollectionSetupMock();
  usageCollectionMock.makeUsageCollector.mockImplementation((config) => {
    collector = new Collector(logger, config);
    return createUsageCollectionSetupMock().makeUsageCollector(config);
  });

  const legacyConfig$ = pluginInitializerContextConfigMock({}).legacy.globalConfig$;

  const getMockFetchClients = (hits?: unknown[]) => {
    const fetchParamsMock = createCollectorFetchContextMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    // @ts-expect-error for the sake of the tests, we only require `hits`
    esClient.search.mockResolvedValue({ body: { hits: { hits } } });
    fetchParamsMock.esClient = esClient;
    return fetchParamsMock;
  };

  beforeAll(() => registerKibanaUsageCollector(usageCollectionMock, legacyConfig$));
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
      timelion_sheet: { total: 0 },
    });
  });
});
