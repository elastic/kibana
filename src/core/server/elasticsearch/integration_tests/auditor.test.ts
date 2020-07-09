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
  createRootWithCorePlugins,
  createTestServers,
  TestElasticsearchUtils,
  TestUtils,
} from '../../../../test_utils/kbn_server';
import { httpServerMock } from '../../http/http_server.mocks';

describe('Elasticsearch', () => {
  let servers: TestUtils;
  let esServer: TestElasticsearchUtils;
  let root: ReturnType<typeof createRootWithCorePlugins>;

  beforeAll(async () => {
    servers = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
    });
    esServer = await servers.startES();
  });

  beforeEach(async () => {
    root = createRootWithCorePlugins();
  });

  afterEach(async () => {
    await root.shutdown();
  });

  afterAll(async () => {
    await esServer.stop();
  });

  describe('Auditor', () => {
    it('logs elasticsearch requests done on behalf on the current & internal user', async () => {
      const internalSetup = await root.setup();
      const auditor = { add: jest.fn(), withAuditScope: jest.fn() };
      const auditorFactory = jest.fn().mockReturnValueOnce(auditor);

      internalSetup.auditTrail.register({ asScoped: auditorFactory });
      const internalStart = await root.start();
      const client = internalStart.elasticsearch.client.asScoped(
        httpServerMock.createKibanaRequest()
      );
      expect(auditorFactory).toHaveBeenCalledTimes(1);
      expect(auditor.add).toHaveBeenCalledTimes(0);

      await client.asCurrentUser.ping();
      expect(auditor.add).toHaveBeenCalledTimes(1);
      expect(auditor.add).toHaveBeenCalledWith({
        message: 'HEAD /',
        type: 'elasticsearch.call.currentUser',
      });

      auditor.add.mockReset();
      await client.asInternalUser.ping();

      expect(auditor.add).toHaveBeenCalledTimes(1);
      expect(auditor.add).toHaveBeenCalledWith({
        message: 'HEAD /',
        type: 'elasticsearch.call.internalUser',
      });
    });

    it('ScopedClusterClient.asInternalUser() writes into auditor', async () => {
      const internalSetup = await root.setup();
      const firstAuditor = { add: jest.fn(), withAuditScope: jest.fn() };
      const secondAuditor = { add: jest.fn(), withAuditScope: jest.fn() };
      const auditorFactory = jest
        .fn()
        .mockReturnValueOnce(firstAuditor)
        .mockReturnValueOnce(secondAuditor);

      internalSetup.auditTrail.register({ asScoped: auditorFactory });
      const internalStart = await root.start();
      const firstClient = internalStart.elasticsearch.client.asScoped(
        httpServerMock.createKibanaRequest()
      );

      const secondClient = internalStart.elasticsearch.client.asScoped(
        httpServerMock.createKibanaRequest()
      );

      await firstClient.asInternalUser.ping();
      expect(firstAuditor.add).toHaveBeenCalledTimes(1);
      expect(secondAuditor.add).toHaveBeenCalledTimes(0);

      await secondClient.asInternalUser.ping();

      expect(firstAuditor.add).toHaveBeenCalledTimes(1);
      expect(secondAuditor.add).toHaveBeenCalledTimes(1);
    });

    it('ScopedClusterClient.asCurrentUser() writes into auditor', async () => {
      const internalSetup = await root.setup();
      const firstAuditor = { add: jest.fn(), withAuditScope: jest.fn() };
      const secondAuditor = { add: jest.fn(), withAuditScope: jest.fn() };
      const auditorFactory = jest
        .fn()
        .mockReturnValueOnce(firstAuditor)
        .mockReturnValueOnce(secondAuditor);

      internalSetup.auditTrail.register({ asScoped: auditorFactory });
      const internalStart = await root.start();
      const firstClient = internalStart.elasticsearch.client.asScoped(
        httpServerMock.createKibanaRequest()
      );

      const secondClient = internalStart.elasticsearch.client.asScoped(
        httpServerMock.createKibanaRequest()
      );

      await firstClient.asCurrentUser.ping();
      expect(firstAuditor.add).toHaveBeenCalledTimes(1);
      expect(secondAuditor.add).toHaveBeenCalledTimes(0);

      await secondClient.asCurrentUser.ping();

      expect(firstAuditor.add).toHaveBeenCalledTimes(1);
      expect(secondAuditor.add).toHaveBeenCalledTimes(1);
    });
  });
});
