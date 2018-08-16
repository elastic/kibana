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
// @ts-ignore
import es from 'elasticsearch';
jest.mock('elasticsearch', () => ({
  Client: mockFn,
}));

const mockFn = jest.fn(() => {
  return {
    close: jest.fn(),
  };
});

import { ConnectableObservable, of } from 'rxjs';
import { first } from 'rxjs/operators';
import { logger } from '../../logging/__mocks__';
import { AdminClient } from '../admin_client';
import { ElasticsearchConfigs } from '../elasticsearch_configs';
import { ElasticsearchService } from '../elasticsearch_service';
import { ScopedDataClient } from '../scoped_data_client';

it('should not create multiple clients while service is running', async () => {
  const createElasticsearchConfig = (type: string) => ({
    filterHeaders: () => {},
    requestHeadersWhitelist: [],
    toElasticsearchClientConfig: (options: any) => ({ type, options }),
  });
  const elasticsearchConfigs = {
    forType: (type: string) => createElasticsearchConfig(type),
  };
  const configs$: ConnectableObservable<ElasticsearchConfigs> = of(elasticsearchConfigs);
  const service = new ElasticsearchService(configs$, logger);

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
  expect(mockFn).toHaveBeenCalledTimes(2);

  // Check that specifically the admin client and the data client
  // were created
  expect(mockFn.mock.calls).toMatchSnapshot();
});

it('should get an AdminClient', async () => {
  const elasticsearchConfigs = {
    forType: () => ({ toElasticsearchClientConfig: () => {} }),
  };

  const configs$: ConnectableObservable<ElasticsearchConfigs> = of(elasticsearchConfigs);

  const service = new ElasticsearchService(configs$, logger);
  const adminClient = await service
    .getAdminClient$()
    .pipe(first())
    .toPromise(Promise);

  expect(adminClient).toBeInstanceOf(AdminClient);
});

it('should get a ScopedDataClient', async () => {
  const elasticsearchConfig = {
    filterHeaders: () => {},
    requestHeadersWhitelist: [],
    toElasticsearchClientConfig: () => {},
  };

  const elasticsearchConfigs = {
    forType: () => elasticsearchConfig,
  };

  const configs$: ConnectableObservable<ElasticsearchConfigs> = of(elasticsearchConfigs);

  const service = new ElasticsearchService(configs$, logger);
  const dataClient = await service.getScopedDataClient({ foo: 'bar' });

  expect(dataClient).toBeInstanceOf(ScopedDataClient);
});

it('should get a ScopedDataClient observable', async () => {
  const elasticsearchConfig = {
    filterHeaders: jest.fn(),
    requestHeadersWhitelist: [],
    toElasticsearchClientConfig: () => {},
  };

  const elasticsearchConfigs = {
    forType: () => elasticsearchConfig,
  };

  const configs$ = of(elasticsearchConfigs);

  const service = new ElasticsearchService(configs$, logger);
  const dataClient$ = service.getScopedDataClient$({ foo: 'bar' });

  const dataClient = await dataClient$.pipe(first()).toPromise(Promise);

  expect(dataClient).toBeInstanceOf(ScopedDataClient);
  expect(elasticsearchConfig.filterHeaders).toHaveBeenCalledWith({
    foo: 'bar',
  });
});
