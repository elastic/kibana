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

/* tslint:disable:no-empty */
const mockCreateClient = jest.fn();

jest.mock('elasticsearch', () => ({
  Client: mockCreateClient,
}));

import { BehaviorSubject, first, k$, toPromise } from '@kbn/observable';
import { logger } from '../../../logging/__mocks__';
import { AdminClient } from '../admin_client';
import { ElasticsearchService } from '../elasticsearch_service';
import { ScopedDataClient } from '../scoped_data_client';

test('should not create multiple clients while service is running', async () => {
  const createElasticsearchConfig = (type: string) => ({
    filterHeaders: () => {},
    requestHeadersWhitelist: [],
    toElasticsearchClientConfig: (options: any) => ({ type, options }),
  });
  const elasticsearchConfigs = {
    forType: (type: string) => createElasticsearchConfig(type),
  };
  const configs$: any = new BehaviorSubject(elasticsearchConfigs);
  const service = new ElasticsearchService(configs$, logger);

  mockCreateClient.mockReset();

  // Start subscribing to this.clients$,
  // which means new elasticsearch data and admin clients are created,
  // calling mockCreateClient once for each client (twice)
  await service.start();

  // Get the latest elasticsearch data client
  // and create a ScopedDataClient around it
  await service.getScopedDataClient({ foo: 'bar' });
  // Calling it again does not create any new elasticsearch clients
  await service.getScopedDataClient({ foo: 'bar' });

  await service.stop();

  // We expect it to be called only twice: once for the data client
  // and once for the admin client.
  expect(mockCreateClient).toHaveBeenCalledTimes(2);

  // Check that specifically the admin client and the data client
  // were created
  expect(mockCreateClient.mock.calls).toMatchSnapshot();
});

test('should get an AdminClient', async () => {
  const elasticsearchConfigs = {
    forType: () => ({ toElasticsearchClientConfig: () => {} }),
  };

  const configs$: any = new BehaviorSubject(elasticsearchConfigs);

  const service = new ElasticsearchService(configs$, logger);
  const adminClient = await k$(service.getAdminClient$())(first(), toPromise());

  expect(adminClient).toBeInstanceOf(AdminClient);
});

test('should get a ScopedDataClient', async () => {
  const elasticsearchConfig = {
    filterHeaders: () => {},
    requestHeadersWhitelist: [],
    toElasticsearchClientConfig: () => {},
  };

  const elasticsearchConfigs = {
    forType: () => elasticsearchConfig,
  };

  const configs$: any = new BehaviorSubject(elasticsearchConfigs);

  const service = new ElasticsearchService(configs$, logger);
  const dataClient = await service.getScopedDataClient({ foo: 'bar' });

  expect(dataClient).toBeInstanceOf(ScopedDataClient);
});

test('should get a ScopedDataClient observable', async () => {
  const elasticsearchConfig = {
    filterHeaders: jest.fn(),
    requestHeadersWhitelist: [],
    toElasticsearchClientConfig: () => {},
  };

  const elasticsearchConfigs = {
    forType: () => elasticsearchConfig,
  };

  const configs$: any = new BehaviorSubject(elasticsearchConfigs);

  const service = new ElasticsearchService(configs$, logger);
  const dataClient$ = service.getScopedDataClient$({ foo: 'bar' });

  const dataClient = await k$(dataClient$)(first(), toPromise());

  expect(dataClient).toBeInstanceOf(ScopedDataClient);
  expect(elasticsearchConfig.filterHeaders).toHaveBeenCalledWith({
    foo: 'bar',
  });
});
