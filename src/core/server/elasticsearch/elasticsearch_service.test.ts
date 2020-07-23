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

import { MockLegacyClusterClient, MockClusterClient } from './elasticsearch_service.test.mocks';
import { BehaviorSubject } from 'rxjs';
import { first } from 'rxjs/operators';
import { Env } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';
import { CoreContext } from '../core_context';
import { configServiceMock } from '../config/config_service.mock';
import { loggingSystemMock } from '../logging/logging_system.mock';
import { httpServiceMock } from '../http/http_service.mock';
import { auditTrailServiceMock } from '../audit_trail/audit_trail_service.mock';
import { ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchService } from './elasticsearch_service';
import { elasticsearchServiceMock } from './elasticsearch_service.mock';
import { elasticsearchClientMock } from './client/mocks';
import { duration } from 'moment';

const delay = async (durationMs: number) =>
  await new Promise((resolve) => setTimeout(resolve, durationMs));

let elasticsearchService: ElasticsearchService;
const configService = configServiceMock.create();
const setupDeps = {
  http: httpServiceMock.createInternalSetupContract(),
};
const startDeps = {
  auditTrail: auditTrailServiceMock.createStartContract(),
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
const logger = loggingSystemMock.create();

let mockClusterClientInstance: ReturnType<typeof elasticsearchClientMock.createCustomClusterClient>;
let mockLegacyClusterClientInstance: ReturnType<typeof elasticsearchServiceMock.createLegacyCustomClusterClient>;

beforeEach(() => {
  env = Env.createDefault(getEnvOptions());

  coreContext = { coreId: Symbol(), env, logger, configService: configService as any };
  elasticsearchService = new ElasticsearchService(coreContext);

  MockLegacyClusterClient.mockClear();
  MockClusterClient.mockClear();

  mockLegacyClusterClientInstance = elasticsearchServiceMock.createLegacyCustomClusterClient();
  MockLegacyClusterClient.mockImplementation(() => mockLegacyClusterClientInstance);
  mockClusterClientInstance = elasticsearchClientMock.createCustomClusterClient();
  MockClusterClient.mockImplementation(() => mockClusterClientInstance);
});

afterEach(() => jest.clearAllMocks());

describe('#setup', () => {
  it('returns legacy Elasticsearch config as a part of the contract', async () => {
    const setupContract = await elasticsearchService.setup(setupDeps);

    await expect(setupContract.legacy.config$.pipe(first()).toPromise()).resolves.toBeInstanceOf(
      ElasticsearchConfig
    );
  });

  it('returns legacy elasticsearch client as a part of the contract', async () => {
    const setupContract = await elasticsearchService.setup(setupDeps);
    const client = setupContract.legacy.client;

    expect(mockLegacyClusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(0);
    await client.callAsInternalUser('any');
    expect(mockLegacyClusterClientInstance.callAsInternalUser).toHaveBeenCalledTimes(1);
  });

  describe('#createLegacyClient', () => {
    it('allows to specify config properties', async () => {
      const setupContract = await elasticsearchService.setup(setupDeps);

      // reset all mocks called during setup phase
      MockLegacyClusterClient.mockClear();

      const customConfig = { logQueries: true };
      const clusterClient = setupContract.legacy.createClient('some-custom-type', customConfig);

      expect(clusterClient).toBe(mockLegacyClusterClientInstance);

      expect(MockLegacyClusterClient).toHaveBeenCalledWith(
        expect.objectContaining(customConfig),
        expect.objectContaining({ context: ['elasticsearch', 'some-custom-type'] }),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('falls back to elasticsearch default config values if property not specified', async () => {
      const setupContract = await elasticsearchService.setup(setupDeps);

      // reset all mocks called during setup phase
      MockLegacyClusterClient.mockClear();

      const customConfig = {
        hosts: ['http://8.8.8.8'],
        logQueries: true,
        ssl: { certificate: 'certificate-value' },
      };
      setupContract.legacy.createClient('some-custom-type', customConfig);

      const config = MockLegacyClusterClient.mock.calls[0][0];
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
      const setupContract = await elasticsearchService.setup(setupDeps);

      // reset all mocks called during setup phase
      MockLegacyClusterClient.mockClear();

      setupContract.legacy.createClient('another-type');

      const config = MockLegacyClusterClient.mock.calls[0][0];
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
      const setupContract = await elasticsearchService.setup(setupDeps);

      // reset all mocks called during setup phase
      MockLegacyClusterClient.mockClear();

      const customConfig = {
        hosts: ['http://8.8.8.8'],
        logQueries: true,
        ssl: { certificate: 'certificate-value' },
      };
      setupContract.legacy.createClient('some-custom-type', customConfig);

      const config = MockLegacyClusterClient.mock.calls[0][0];
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
    const mockedClient = mockClusterClientInstance.asInternalUser;
    mockedClient.nodes.info.mockImplementation(() =>
      elasticsearchClientMock.createClientError(new Error())
    );

    const setupContract = await elasticsearchService.setup(setupDeps);
    await delay(10);

    expect(mockedClient.nodes.info).toHaveBeenCalledTimes(0);
    setupContract.esNodesCompatibility$.subscribe(() => {
      expect(mockedClient.nodes.info).toHaveBeenCalledTimes(1);
      done();
    });
  });

  it('esNodeVersionCompatibility$ stops polling when unsubscribed from', async (done) => {
    const mockedClient = mockClusterClientInstance.asInternalUser;
    mockedClient.nodes.info.mockImplementation(() =>
      elasticsearchClientMock.createClientError(new Error())
    );

    const setupContract = await elasticsearchService.setup(setupDeps);

    expect(mockedClient.nodes.info).toHaveBeenCalledTimes(0);
    const sub = setupContract.esNodesCompatibility$.subscribe(async () => {
      sub.unsubscribe();
      await delay(100);
      expect(mockedClient.nodes.info).toHaveBeenCalledTimes(1);
      done();
    });
  });
});

describe('#start', () => {
  it('throws if called before `setup`', async () => {
    expect(() => elasticsearchService.start(startDeps)).rejects.toMatchInlineSnapshot(
      `[Error: ElasticsearchService needs to be setup before calling start]`
    );
  });

  it('returns elasticsearch client as a part of the contract', async () => {
    await elasticsearchService.setup(setupDeps);
    const startContract = await elasticsearchService.start(startDeps);
    const client = startContract.client;

    expect(client.asInternalUser).toBe(mockClusterClientInstance.asInternalUser);
  });

  describe('#createClient', () => {
    it('allows to specify config properties', async () => {
      await elasticsearchService.setup(setupDeps);
      const startContract = await elasticsearchService.start(startDeps);

      // reset all mocks called during setup phase
      MockClusterClient.mockClear();

      const customConfig = { logQueries: true };
      const clusterClient = startContract.createClient('custom-type', customConfig);

      expect(clusterClient).toBe(mockClusterClientInstance);

      expect(MockClusterClient).toHaveBeenCalledTimes(1);
      expect(MockClusterClient).toHaveBeenCalledWith(
        expect.objectContaining(customConfig),
        expect.objectContaining({ context: ['elasticsearch', 'custom-type'] }),
        expect.any(Function)
      );
    });
    it('creates a new client on each call', async () => {
      await elasticsearchService.setup(setupDeps);
      const startContract = await elasticsearchService.start(startDeps);

      // reset all mocks called during setup phase
      MockClusterClient.mockClear();

      const customConfig = { logQueries: true };

      startContract.createClient('custom-type', customConfig);
      startContract.createClient('another-type', customConfig);

      expect(MockClusterClient).toHaveBeenCalledTimes(2);
    });

    it('falls back to elasticsearch default config values if property not specified', async () => {
      await elasticsearchService.setup(setupDeps);
      const startContract = await elasticsearchService.start(startDeps);

      // reset all mocks called during setup phase
      MockClusterClient.mockClear();

      const customConfig = {
        hosts: ['http://8.8.8.8'],
        logQueries: true,
        ssl: { certificate: 'certificate-value' },
      };

      startContract.createClient('some-custom-type', customConfig);
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
  });
});

describe('#stop', () => {
  it('stops both legacy and new clients', async () => {
    await elasticsearchService.setup(setupDeps);
    await elasticsearchService.start(startDeps);
    await elasticsearchService.stop();

    expect(mockLegacyClusterClientInstance.close).toHaveBeenCalledTimes(1);
    expect(mockClusterClientInstance.close).toHaveBeenCalledTimes(1);
  });

  it('stops pollEsNodeVersions even if there are active subscriptions', async (done) => {
    expect.assertions(2);

    const mockedClient = mockClusterClientInstance.asInternalUser;
    mockedClient.nodes.info.mockImplementation(() =>
      elasticsearchClientMock.createClientError(new Error())
    );

    const setupContract = await elasticsearchService.setup(setupDeps);

    setupContract.esNodesCompatibility$.subscribe(async () => {
      expect(mockedClient.nodes.info).toHaveBeenCalledTimes(1);

      await elasticsearchService.stop();
      await delay(100);
      expect(mockedClient.nodes.info).toHaveBeenCalledTimes(1);
      done();
    });
  });
});
