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
import { InternalCoreStart } from '../../internal_types';
import {
  createRootWithCorePlugins,
  createTestServers,
  TestElasticsearchUtils,
  TestUtils,
} from '../../../../test_utils/kbn_server';
import { httpServerMock } from '../../http/http_server.mocks';

describe('Elasticsearch integration with Auditor', () => {
  let servers: TestUtils;
  let esServer: TestElasticsearchUtils;
  let root: ReturnType<typeof createRootWithCorePlugins>;
  let internalStart: InternalCoreStart;
  const auditor = { add: jest.fn(), withAuditScope: jest.fn() };
  const auditorFactory = jest.fn().mockReturnValue(auditor);

  beforeAll(async () => {
    servers = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
    });
    esServer = await servers.startES();
    root = createRootWithCorePlugins();
    const internalSetup = await root.setup();

    internalSetup.auditTrail.register({ asScoped: auditorFactory });
    internalStart = await root.start();
  });

  afterAll(async () => {
    await root.shutdown();
    await esServer.stop();
  });

  afterEach(() => {
    auditor.add.mockClear();
    auditorFactory.mockClear();
  });

  describe('Legacy', () => {
    describe('client', () => {
      it('do not logs requests performed with un-scoped client', async () => {
        await internalStart.elasticsearch.legacy.client.callAsInternalUser('ping');
        expect(auditorFactory).toHaveBeenCalledTimes(0);
        expect(auditor.add).toHaveBeenCalledTimes(0);
      });

      it('ScopedClusterClient.callAsInternalUser() writes into auditor', async () => {
        const client = internalStart.elasticsearch.legacy.client.asScoped(
          httpServerMock.createKibanaRequest()
        );

        await client.callAsInternalUser('ping');
        expect(auditor.add).toHaveBeenCalledTimes(1);
        expect(auditor.add).toHaveBeenCalledWith({
          message: 'ping',
          type: 'legacy.elasticsearch.call.internalUser',
        });
      });

      it('ScopedClusterClient.callAsCurrentUser() writes into auditor', async () => {
        const client = internalStart.elasticsearch.legacy.client.asScoped(
          httpServerMock.createKibanaRequest()
        );

        await client.callAsCurrentUser('ping');
        expect(auditor.add).toHaveBeenCalledTimes(1);
        expect(auditor.add).toHaveBeenCalledWith({
          message: 'ping',
          type: 'legacy.elasticsearch.call.currentUser',
        });
      });
    });

    describe('custom client', () => {
      it('do not logs requests performed with un-scoped client', async () => {
        const customClient = internalStart.elasticsearch.legacy.createClient('custom');

        await customClient.callAsInternalUser('ping');
        expect(auditorFactory).toHaveBeenCalledTimes(0);
        expect(auditor.add).toHaveBeenCalledTimes(0);
      });

      it('ScopedClusterClient.callAsInternalUser() writes into auditor', async () => {
        const customClient = internalStart.elasticsearch.legacy.createClient('custom');
        const client = customClient.asScoped(httpServerMock.createKibanaRequest());

        await client.callAsInternalUser('ping');
        expect(auditor.add).toHaveBeenCalledTimes(1);
        expect(auditor.add).toHaveBeenCalledWith({
          message: 'ping',
          type: 'legacy.elasticsearch.call.internalUser',
        });
      });

      it('ScopedClusterClient.callAsCurrentUser() writes into auditor', async () => {
        const customClient = internalStart.elasticsearch.legacy.createClient('custom');
        const client = customClient.asScoped(httpServerMock.createKibanaRequest());

        await client.callAsCurrentUser('ping');
        expect(auditor.add).toHaveBeenCalledTimes(1);
        expect(auditor.add).toHaveBeenCalledWith({
          message: 'ping',
          type: 'legacy.elasticsearch.call.currentUser',
        });
      });
    });
  });

  describe('client', () => {
    it('do not logs requests performed with un-scoped client', async () => {
      await internalStart.elasticsearch.client.asInternalUser.ping();
      expect(auditorFactory).toHaveBeenCalledTimes(0);
      expect(auditor.add).toHaveBeenCalledTimes(0);
    });

    it('ScopedClusterClient.asInternalUser writes into auditor', async () => {
      const client = internalStart.elasticsearch.client.asScoped(
        httpServerMock.createKibanaRequest()
      );

      await client.asInternalUser.ping();
      expect(auditor.add).toHaveBeenCalledTimes(1);
      expect(auditor.add).toHaveBeenCalledWith({
        message: 'HEAD /',
        type: 'elasticsearch.call.internalUser',
      });
    });

    it('ScopedClusterClient.asCurrentUser writes into auditor', async () => {
      const client = internalStart.elasticsearch.client.asScoped(
        httpServerMock.createKibanaRequest()
      );

      await client.asCurrentUser.ping();
      expect(auditor.add).toHaveBeenCalledTimes(1);
      expect(auditor.add).toHaveBeenCalledWith({
        message: 'HEAD /',
        type: 'elasticsearch.call.currentUser',
      });
    });
  });

  describe('custom client', () => {
    it('do not logs requests performed with un-scoped client', async () => {
      const customClient = internalStart.elasticsearch.createClient('custom');

      await customClient.asInternalUser.ping();
      expect(auditorFactory).toHaveBeenCalledTimes(0);
      expect(auditor.add).toHaveBeenCalledTimes(0);
    });

    it('ScopedClusterClient writes into auditor', async () => {
      const customClient = internalStart.elasticsearch.createClient('custom');
      const client = customClient.asScoped(httpServerMock.createKibanaRequest());

      await client.asInternalUser.ping();
      expect(auditor.add).toHaveBeenCalledTimes(1);
      expect(auditor.add).toHaveBeenCalledWith({
        message: 'HEAD /',
        type: 'elasticsearch.call.internalUser',
      });
    });

    it('ScopedClusterClient.asCurrentUser() writes into auditor', async () => {
      const customClient = internalStart.elasticsearch.createClient('custom');
      const client = customClient.asScoped(httpServerMock.createKibanaRequest());

      await client.asCurrentUser.ping();
      expect(auditor.add).toHaveBeenCalledTimes(1);
      expect(auditor.add).toHaveBeenCalledWith({
        message: 'HEAD /',
        type: 'elasticsearch.call.currentUser',
      });
    });
  });
});
