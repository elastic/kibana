/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { configureClientMock } from './cluster_client.test.mocks';
import { duration } from 'moment';
import type { Client } from '@elastic/elasticsearch';
import { ByteSizeValue } from '@kbn/config-schema';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { markExternalUiamCredential } from '@kbn/core-security-server';
import { AgentManager } from './agent_manager';
import { ClusterClient } from './cluster_client';
import { getRequestHandlerFactory } from './cps_request_handler';
import { captureResearchEsCapability, registerResearchEsAlias } from './research_capability';

const config: ElasticsearchClientConfig = {
  sniffOnStart: false,
  sniffOnConnectionFault: false,
  sniffInterval: false,
  maxSockets: 100,
  maxIdleSockets: 10,
  idleSocketTimeout: duration(30, 's'),
  compression: false,
  requestHeadersWhitelist: ['authorization'],
  customHeaders: { 'x-custom': 'fixture' },
  hosts: ['http://localhost'],
  dnsCacheTtl: duration(0),
  username: 'internal-user',
  password: 'fixture-only-internal',
  maxResponseSize: new ByteSizeValue(1024),
};
describe('research ES capability (private Core seam)', () => {
  const original = process.env.KBN_RESEARCH_CAPABILITY_KIT;
  beforeEach(() => {
    process.env.KBN_RESEARCH_CAPABILITY_KIT = 'true';
    configureClientMock.mockReset();
  });
  afterEach(() => {
    if (original === undefined) delete process.env.KBN_RESEARCH_CAPABILITY_KIT;
    else process.env.KBN_RESEARCH_CAPABILITY_KIT = original;
  });
  const setup = () => {
    const logger = loggingSystemMock.createLogger();
    const child = jest.fn();
    const client = { child, close: jest.fn() };
    configureClientMock.mockReturnValue(client as Pick<Client, 'child' | 'close'>);
    const authHeaders = httpServiceMock.createAuthHeaderStorage();
    authHeaders.get.mockReturnValue({
      authorization: 'Bearer essu_provider',
      'x-client-authentication': 'fixture-relayed',
    });
    const cluster = new ClusterClient({
      config,
      logger,
      type: 'test',
      authHeaders,
      security: securityServiceMock.createInternalSetup(),
      agentFactoryProvider: new AgentManager(logger, { dnsCacheTtlInSeconds: 0 }),
      kibanaVersion: '9.5.0',
      getExecutionContext: () => 'task:fixture',
      onRequestHandlerFactory: getRequestHandlerFactory(true),
    });
    return { cluster, child, authHeaders };
  };

  it.each(['task', 'external-uiam-task', 'session'] as const)(
    'captures exact %s scoped header resolution and space policy',
    (kind) => {
      const { cluster, child } = setup();
      const request =
        kind === 'session'
          ? httpServerMock.createKibanaRequest({
              headers: { authorization: 'Bearer wire-credential' },
            })
          : httpServerMock.createFakeKibanaRequest({
              headers: { authorization: 'ApiKey essu_fixture' },
            });
      Object.defineProperty(request, 'spaceId', { value: 'space-a' });
      if (kind === 'external-uiam-task') markExternalUiamCredential(request);
      void cluster.asScoped(request, { projectRouting: 'space' }).asCurrentUser;
      const capability = captureResearchEsCapability(cluster, request, 'current', {
        projectRouting: 'space',
      });
      expect(capability.headers).toEqual(child.mock.calls[0][0].headers);
      expect(capability.executionContext).toBe('task:fixture');
      expect(capability.routing.enabled).toBe(true);
      expect(capability.routing.expression).toContain('space-a');
      expect(capability.config).not.toHaveProperty('password');
      expect(capability.config).not.toHaveProperty('username');
      expect(capability.config.maxResponseSize?.getValueInBytes()).toBe(1024);
      if (kind === 'external-uiam-task')
        expect(capability.headers).not.toHaveProperty('x-client-authentication');
      if (kind === 'session')
        expect(capability.headers?.authorization).toBe('Bearer essu_provider');
    }
  );

  it('captures through the actual start-contract facade shape', () => {
    const { cluster } = setup();
    const facade = registerResearchEsAlias(
      { asInternalUser: cluster.asInternalUser, asScoped: cluster.asScoped.bind(cluster) },
      cluster
    );
    const request = { headers: { authorization: 'ApiKey fixture' } };
    expect(captureResearchEsCapability(facade, request)).toEqual(
      captureResearchEsCapability(cluster, request)
    );
  });

  it('keeps secondary credentials and internal authority distinct', () => {
    const { cluster, child } = setup();
    const request = httpServerMock.createFakeKibanaRequest({
      headers: { authorization: 'ApiKey fixture' },
    });
    void cluster.asScoped(request).asSecondaryAuthUser;
    expect(captureResearchEsCapability(cluster, request, 'secondary').headers).toEqual(
      child.mock.calls[0][0].headers
    );
    const internal = captureResearchEsCapability(cluster, request, 'internal');
    expect(internal.headers).toBeUndefined();
    expect(internal.config.username).toBe('internal-user');
    expect(internal.config.password).toBeDefined();
  });

  it('rejects disabled/unregistered clients and unknown routing factories', () => {
    const { cluster } = setup();
    process.env.KBN_RESEARCH_CAPABILITY_KIT = 'false';
    const { cluster: disabled } = setup();
    const request = { headers: { authorization: 'ApiKey fixture' } };
    expect(() => captureResearchEsCapability(disabled, request)).toThrow(/disabled|unsupported/);
    expect(cluster).toBeDefined();
  });
});
