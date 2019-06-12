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

import { MockClusterClient } from './elasticsearch_service.test.mocks';

import { BehaviorSubject, combineLatest } from 'rxjs';
import { Env } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { CoreContext } from '../core_context';
import { configServiceMock } from '../config/config_service.mock';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchService } from './elasticsearch_service';

let elasticsearchService: ElasticsearchService;
const configService = configServiceMock.create();
configService.atPath.mockReturnValue(
  new BehaviorSubject({
    hosts: ['http://1.2.3.4'],
    healthCheck: {},
    ssl: {},
  } as any)
);

let env: Env;
let coreContext: CoreContext;
const logger = loggingServiceMock.create();
beforeEach(() => {
  env = Env.createDefault(getEnvOptions());

  coreContext = { env, logger, configService: configService as any };
  elasticsearchService = new ElasticsearchService(coreContext);
});

afterEach(() => jest.clearAllMocks());

describe('#setup', () => {
  test('returns legacy Elasticsearch config as a part of the contract', async () => {
    const setupContract = await elasticsearchService.setup();

    await expect(setupContract.legacy.config$.pipe(first()).toPromise()).resolves.toBeInstanceOf(
      ElasticsearchConfig
    );
  });

  test('returns data and admin client observables as a part of the contract', async () => {
    const mockAdminClusterClientInstance = { close: jest.fn() };
    const mockDataClusterClientInstance = { close: jest.fn() };
    MockClusterClient.mockImplementationOnce(
      () => mockAdminClusterClientInstance
    ).mockImplementationOnce(() => mockDataClusterClientInstance);

    const setupContract = await elasticsearchService.setup();

    const [esConfig, adminClient, dataClient] = await combineLatest(
      setupContract.legacy.config$,
      setupContract.adminClient$,
      setupContract.dataClient$
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
    const setupContract = await elasticsearchService.setup();

    const mockClusterClientInstance = { close: jest.fn() };
    MockClusterClient.mockImplementation(() => mockClusterClientInstance);

    const mockConfig = { logQueries: true };
    const clusterClient = setupContract.createClient('some-custom-type', mockConfig as any);

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

    await elasticsearchService.setup();
    await elasticsearchService.stop();

    expect(mockAdminClusterClientInstance.close).toHaveBeenCalledTimes(1);
    expect(mockDataClusterClientInstance.close).toHaveBeenCalledTimes(1);
  });
});
