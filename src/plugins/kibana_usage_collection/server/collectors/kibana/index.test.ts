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

import {
  loggingSystemMock,
  pluginInitializerContextConfigMock,
  elasticsearchServiceMock,
} from '../../../../../core/server/mocks';
import {
  Collector,
  createCollectorFetchContextMock,
  createUsageCollectionSetupMock,
} from '../../../../usage_collection/server/usage_collection.mock';
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
    esClient.search.mockResolvedValue({ body: { hits: { hits } } } as any);
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
