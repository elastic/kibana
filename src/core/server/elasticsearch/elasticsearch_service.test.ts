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

import { first } from 'rxjs/operators';

const MockClusterClient = jest.fn();
jest.mock('./cluster_client', () => ({ ClusterClient: MockClusterClient }));

import { BehaviorSubject, combineLatest } from 'rxjs';
import { Config, ConfigService, Env, ObjectToConfigAdapter } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { CoreContext } from '../core_context';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchService } from './elasticsearch_service';

let elasticsearchService: ElasticsearchService;
let configService: ConfigService;
let env: Env;
let coreContext: CoreContext;
const logger = loggingServiceMock.create();
beforeEach(() => {
  env = Env.createDefault(getEnvOptions());

  configService = new ConfigService(
    new BehaviorSubject<Config>(
      new ObjectToConfigAdapter({
        elasticsearch: { hosts: ['http://1.2.3.4'], username: 'jest' },
      })
    ),
    env,
    logger
  );

  coreContext = { env, logger, configService };
  elasticsearchService = new ElasticsearchService(coreContext);
});

afterEach(() => jest.clearAllMocks());

describe('#start', () => {
  test('returns legacy Elasticsearch config as a part of the contract', async () => {
    const startContract = await elasticsearchService.start();

    await expect(startContract.legacy.config$.pipe(first()).toPromise()).resolves.toBeInstanceOf(
      ElasticsearchConfig
    );
  });

  test('returns data and admin client observables as a part of the contract', async () => {
    const mockAdminClusterClientInstance = { close: jest.fn() };
    const mockDataClusterClientInstance = { close: jest.fn() };
    MockClusterClient.mockImplementationOnce(
      () => mockAdminClusterClientInstance
    ).mockImplementationOnce(() => mockDataClusterClientInstance);

    const startContract = await elasticsearchService.start();

    const [esConfig, adminClient, dataClient] = await combineLatest(
      startContract.legacy.config$,
      startContract.adminClient$,
      startContract.dataClient$
    )
      .pipe(first())
      .toPromise();

    expect(adminClient).toBe(mockAdminClusterClientInstance);
    expect(dataClient).toBe(mockDataClusterClientInstance);

    expect(MockClusterClient).toHaveBeenCalledTimes(2);
    expect(MockClusterClient).toHaveBeenNthCalledWith(
      1,
      esConfig,
      expect.objectContaining({ context: ['elasticsearch', 'admin'] })
    );
    expect(MockClusterClient).toHaveBeenNthCalledWith(
      2,
      esConfig,
      expect.objectContaining({ context: ['elasticsearch', 'data'] })
    );

    expect(mockAdminClusterClientInstance.close).not.toHaveBeenCalled();
    expect(mockDataClusterClientInstance.close).not.toHaveBeenCalled();
  });

  test('returns `createClient` as a part of the contract', async () => {
    const startContract = await elasticsearchService.start();

    const mockClusterClientInstance = { close: jest.fn() };
    MockClusterClient.mockImplementation(() => mockClusterClientInstance);

    const mockConfig = { logQueries: true };
    const clusterClient = startContract.createClient('some-custom-type', mockConfig as any);

    expect(clusterClient).toBe(mockClusterClientInstance);

    expect(MockClusterClient).toHaveBeenCalledWith(
      mockConfig,
      expect.objectContaining({ context: ['elasticsearch', 'some-custom-type'] })
    );
  });
});

describe('#stop', () => {
  test('stops both admin and data clients', async () => {
    const mockAdminClusterClientInstance = { close: jest.fn() };
    const mockDataClusterClientInstance = { close: jest.fn() };
    MockClusterClient.mockImplementationOnce(
      () => mockAdminClusterClientInstance
    ).mockImplementationOnce(() => mockDataClusterClientInstance);

    await elasticsearchService.start();
    await elasticsearchService.stop();

    expect(mockAdminClusterClientInstance.close).toHaveBeenCalledTimes(1);
    expect(mockDataClusterClientInstance.close).toHaveBeenCalledTimes(1);
  });
});
