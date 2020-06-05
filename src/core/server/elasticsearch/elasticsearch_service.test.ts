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

import { BehaviorSubject } from 'rxjs';
import { Env } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { CoreContext } from '../core_context';
import { configServiceMock } from '../config/config_service.mock';
import { loggingServiceMock } from '../logging/logging_service.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchService } from './elasticsearch_service';
import { elasticsearchServiceMock } from './elasticsearch_service.mock';
import { duration } from 'moment';

const delay = async (durationMs: number) =>
  await new Promise((resolve) => setTimeout(resolve, durationMs));

let elasticsearchService: ElasticsearchService;
const configService = configServiceMock.create();
const deps = {
  http: httpServiceMock.createSetupContract(),
};
configService.atPath.mockReturnValue(
  new BehaviorSubject({
    hosts: ['http://1.2.3.4'],
    healthCheck: {
      delay: duration(10),
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

  it('returns elasticsearch client as a part of the contract', async () => {
    const mockClusterClientInstance = elasticsearchServiceMock.createClusterClient();
    MockClusterClient.mockImplementationOnce(() => mockClusterClientInstance);

    const setupContract = await elasticsearchService.setup(deps);
    const client = setupContract.legacy.client;

    expect(mockClusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(0);
    await client.callAsInternalUser('any');
    expect(mockClusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(1);
  });

  describe('#createClient', () => {
    it('allows to specify config properties', async () => {
      const setupContract = await elasticsearchService.setup(deps);

      const mockClusterClientInstance = { close: jest.fn() };
      MockClusterClient.mockImplementation(() => mockClusterClientInstance);

      const customConfig = { logQueries: true };
      const clusterClient = setupContract.legacy.createClient('some-custom-type', customConfig);

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
      setupContract.legacy.createClient('some-custom-type', customConfig);

      const config = MockClusterClient.mock.calls[0][0];
      expect(config).toMatchInlineSnapshot(`
        Object {
          "healthCheckDelay": "PT0.01S",
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

      setupContract.legacy.createClient('another-type');

      const config = MockClusterClient.mock.calls[0][0];
      expect(config).toMatchInlineSnapshot(`
        Object {
          "healthCheckDelay": "PT0.01S",
          "hosts": Array [
            "http://1.2.3.4",
          ],
          "requestHeadersWhitelist": Array [
            undefined,
          ],
          "ssl": Object {
            "alwaysPresentCertificate": undefined,
            "certificate": undefined,
            "certificateAuthorities": undefined,
            "key": undefined,
            "keyPassphrase": undefined,
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
            delay: duration(2000),
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
      setupContract.legacy.createClient('some-custom-type', customConfig);

      const config = MockClusterClient.mock.calls[0][0];
      expect(config).toMatchInlineSnapshot(`
        Object {
          "healthCheckDelay": "PT2S",
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

  it('esNodeVersionCompatibility$ only starts polling when subscribed to', async (done) => {
    const clusterClientInstance = elasticsearchServiceMock.createClusterClient();
    MockClusterClient.mockImplementationOnce(() => clusterClientInstance);

    clusterClientInstance.callAsInternalUser.mockRejectedValue(new Error());

    const setupContract = await elasticsearchService.setup(deps);
    await delay(10);

    expect(clusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(0);
    setupContract.esNodesCompatibility$.subscribe(() => {
      expect(clusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('esNodeVersionCompatibility$ stops polling when unsubscribed from', async (done) => {
    const mockClusterClientInstance = elasticsearchServiceMock.createClusterClient();
    MockClusterClient.mockImplementationOnce(() => mockClusterClientInstance);

    mockClusterClientInstance.callAsInternalUser.mockRejectedValue(new Error());

    const setupContract = await elasticsearchService.setup(deps);

    expect(mockClusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(0);
    const sub = setupContract.esNodesCompatibility$.subscribe(async () => {
      sub.unsubscribe();
      await delay(100);
      expect(mockClusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(1);
      done();
    });
  });
});

describe('#stop', () => {
  it('stops both admin and data clients', async () => {
    const mockClusterClientInstance = { close: jest.fn() };
    MockClusterClient.mockImplementationOnce(() => mockClusterClientInstance);

    await elasticsearchService.setup(deps);
    await elasticsearchService.stop();

    expect(mockClusterClientInstance.close).toHaveBeenCalledTimes(1);
  });

  it('stops pollEsNodeVersions even if there are active subscriptions', async (done) => {
    expect.assertions(2);
    const mockClusterClientInstance = elasticsearchServiceMock.createCustomClusterClient();

    MockClusterClient.mockImplementationOnce(() => mockClusterClientInstance);

    mockClusterClientInstance.callAsInternalUser.mockRejectedValue(new Error());

    const setupContract = await elasticsearchService.setup(deps);

    setupContract.esNodesCompatibility$.subscribe(async () => {
      expect(mockClusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(1);

      await elasticsearchService.stop();
      await delay(100);
      expect(mockClusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(1);
      done();
    });
  });
});
