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
import { httpServiceMock } from '../http/http_service.mock';
import { ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchService } from './elasticsearch_service';
import { elasticsearchServiceMock } from './elasticsearch_service.mock';

let elasticsearchService: ElasticsearchService;
const configService = configServiceMock.create();
const deps = {
  http: httpServiceMock.createSetupContract(),
};
configService.atPath.mockReturnValue(
  new BehaviorSubject({
    hosts: ['http://1.2.3.4'],
    healthCheck: {
      delay: 2000,
    },
    ssl: {
      verificationMode: 'none',
    },
  } as any)
);

let env: Env;
let coreContext: CoreContext;
const logger = loggingServiceMock.create();
beforeEach(() => {
  env = Env.createDefault(getEnvOptions());

  coreContext = { coreId: Symbol(), env, logger, configService: configService as any };
  elasticsearchService = new ElasticsearchService(coreContext);
});

afterEach(() => jest.clearAllMocks());

describe('#setup', () => {
  it('returns legacy Elasticsearch config as a part of the contract', async () => {
    const setupContract = await elasticsearchService.setup(deps);

    await expect(setupContract.legacy.config$.pipe(first()).toPromise()).resolves.toBeInstanceOf(
      ElasticsearchConfig
    );
  });

  it('returns data and admin client as a part of the contract', async () => {
    const mockAdminClusterClientInstance = elasticsearchServiceMock.createClusterClient();
    const mockDataClusterClientInstance = elasticsearchServiceMock.createClusterClient();
    MockClusterClient.mockImplementationOnce(
      () => mockAdminClusterClientInstance
    ).mockImplementationOnce(() => mockDataClusterClientInstance);

    const setupContract = await elasticsearchService.setup(deps);

    const adminClient = setupContract.adminClient;
    const dataClient = setupContract.dataClient;

    expect(mockAdminClusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(0);
    await adminClient.callAsInternalUser('any');
    expect(mockAdminClusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(1);

    expect(mockDataClusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(0);
    await dataClient.callAsInternalUser('any');
    expect(mockDataClusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(1);
  });

  it('returns data and admin client observables as a part of the contract', async () => {
    const mockAdminClusterClientInstance = { close: jest.fn() };
    const mockDataClusterClientInstance = { close: jest.fn() };
    MockClusterClient.mockImplementationOnce(
      () => mockAdminClusterClientInstance
    ).mockImplementationOnce(() => mockDataClusterClientInstance);

    const setupContract = await elasticsearchService.setup(deps);

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
      expect.objectContaining({ context: ['elasticsearch', 'admin'] }),
      undefined
    );
    expect(MockClusterClient).toHaveBeenNthCalledWith(
      2,
      esConfig,
      expect.objectContaining({ context: ['elasticsearch', 'data'] }),
      expect.any(Function)
    );

    expect(mockAdminClusterClientInstance.close).not.toHaveBeenCalled();
    expect(mockDataClusterClientInstance.close).not.toHaveBeenCalled();
  });

  describe('#createClient', () => {
    it('allows to specify config properties', async () => {
      const setupContract = await elasticsearchService.setup(deps);

      const mockClusterClientInstance = { close: jest.fn() };
      MockClusterClient.mockImplementation(() => mockClusterClientInstance);

      const customConfig = { logQueries: true };
      const clusterClient = setupContract.createClient('some-custom-type', customConfig);

      expect(clusterClient).toBe(mockClusterClientInstance);

      expect(MockClusterClient).toHaveBeenCalledWith(
        expect.objectContaining(customConfig),
        expect.objectContaining({ context: ['elasticsearch', 'some-custom-type'] }),
        expect.any(Function)
      );
    });

    it('falls back to elasticsearch default config values if property not specified', async () => {
      const setupContract = await elasticsearchService.setup(deps);
      // reset all mocks called during setup phase
      MockClusterClient.mockClear();

      const customConfig = {
        hosts: ['http://8.8.8.8'],
        logQueries: true,
        ssl: { certificate: 'certificate-value' },
      };
      setupContract.createClient('some-custom-type', customConfig);

      const config = MockClusterClient.mock.calls[0][0];
      expect(config).toMatchInlineSnapshot(`
Object {
  "healthCheckDelay": 2000,
  "hosts": Array [
    "http://8.8.8.8",
  ],
  "logQueries": true,
  "requestHeadersWhitelist": Array [
    undefined,
  ],
  "ssl": Object {
    "certificate": "certificate-value",
    "verificationMode": "none",
  },
}
`);
    });
    it('falls back to elasticsearch config if custom config not passed', async () => {
      const setupContract = await elasticsearchService.setup(deps);
      // reset all mocks called during setup phase
      MockClusterClient.mockClear();

      setupContract.createClient('another-type');

      const config = MockClusterClient.mock.calls[0][0];
      expect(config).toMatchInlineSnapshot(`
Object {
  "healthCheckDelay": 2000,
  "hosts": Array [
    "http://1.2.3.4",
  ],
  "requestHeadersWhitelist": Array [
    undefined,
  ],
  "ssl": Object {
    "certificateAuthorities": undefined,
    "verificationMode": "none",
  },
}
`);
    });

    it('does not merge elasticsearch hosts if custom config overrides', async () => {
      configService.atPath.mockReturnValueOnce(
        new BehaviorSubject({
          hosts: ['http://1.2.3.4', 'http://9.8.7.6'],
          healthCheck: {
            delay: 2000,
          },
          ssl: {
            verificationMode: 'none',
          },
        } as any)
      );
      elasticsearchService = new ElasticsearchService(coreContext);
      const setupContract = await elasticsearchService.setup(deps);
      // reset all mocks called during setup phase
      MockClusterClient.mockClear();

      const customConfig = {
        hosts: ['http://8.8.8.8'],
        logQueries: true,
        ssl: { certificate: 'certificate-value' },
      };
      setupContract.createClient('some-custom-type', customConfig);

      const config = MockClusterClient.mock.calls[0][0];
      expect(config).toMatchInlineSnapshot(`
        Object {
          "healthCheckDelay": 2000,
          "hosts": Array [
            "http://8.8.8.8",
          ],
          "logQueries": true,
          "requestHeadersWhitelist": Array [
            undefined,
          ],
          "ssl": Object {
            "certificate": "certificate-value",
            "verificationMode": "none",
          },
        }
      `);
    });
  });
});

describe('#stop', () => {
  it('stops both admin and data clients', async () => {
    const mockAdminClusterClientInstance = { close: jest.fn() };
    const mockDataClusterClientInstance = { close: jest.fn() };
    MockClusterClient.mockImplementationOnce(
      () => mockAdminClusterClientInstance
    ).mockImplementationOnce(() => mockDataClusterClientInstance);

    await elasticsearchService.setup(deps);
    await elasticsearchService.stop();

    expect(mockAdminClusterClientInstance.close).toHaveBeenCalledTimes(1);
    expect(mockDataClusterClientInstance.close).toHaveBeenCalledTimes(1);
  });
});
