/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { errors } from '@elastic/elasticsearch';
import { BehaviorSubject } from 'rxjs';
import tls from 'tls';

import { nextTick } from '@kbn/test-jest-helpers';
import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';

import { pollEsNodesVersion } from '../../../../src/core/server';
import type { NodesVersionCompatibility } from '../../../../src/core/server';
import { ElasticsearchConnectionStatus } from '../common';
import { ConfigSchema } from './config';
import type { ElasticsearchServiceSetup } from './elasticsearch_service';
import { ElasticsearchService } from './elasticsearch_service';
import { interactiveSetupMock } from './mocks';

jest.mock('tls');
jest.mock('../../../../src/core/server', () => ({
  pollEsNodesVersion: jest.fn(),
}));

const tlsConnectMock = tls.connect as jest.MockedFunction<typeof tls.connect>;
const mockPollEsNodesVersion = pollEsNodesVersion as jest.MockedFunction<typeof pollEsNodesVersion>;

function mockCompatibility(isCompatible: boolean, message?: string) {
  mockPollEsNodesVersion.mockReturnValue(
    new BehaviorSubject({ isCompatible, message } as NodesVersionCompatibility).asObservable()
  );
}

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;
  let mockElasticsearchPreboot: ReturnType<typeof elasticsearchServiceMock.createPreboot>;
  beforeEach(() => {
    service = new ElasticsearchService(loggingSystemMock.createLogger(), '8.0.0');
    mockElasticsearchPreboot = elasticsearchServiceMock.createPreboot();
  });

  describe('#setup()', () => {
    let mockConnectionStatusClient: ReturnType<
      typeof elasticsearchServiceMock.createCustomClusterClient
    >;
    let mockEnrollClient: ReturnType<typeof elasticsearchServiceMock.createCustomClusterClient>;
    let mockAuthenticateClient: ReturnType<
      typeof elasticsearchServiceMock.createCustomClusterClient
    >;
    let mockPingClient: ReturnType<typeof elasticsearchServiceMock.createCustomClusterClient>;
    let setupContract: ElasticsearchServiceSetup;
    beforeEach(() => {
      mockConnectionStatusClient = elasticsearchServiceMock.createCustomClusterClient();
      mockEnrollClient = elasticsearchServiceMock.createCustomClusterClient();
      mockAuthenticateClient = elasticsearchServiceMock.createCustomClusterClient();
      mockPingClient = elasticsearchServiceMock.createCustomClusterClient();
      mockElasticsearchPreboot.createClient.mockImplementation((type) => {
        switch (type) {
          case 'enroll':
            return mockEnrollClient;
          case 'authenticate':
            return mockAuthenticateClient;
          case 'ping':
            return mockPingClient;
          default:
            return mockConnectionStatusClient;
        }
      });
      mockPingClient.asInternalUser.transport.request.mockResolvedValue(
        interactiveSetupMock.createApiResponse({
          statusCode: 200,
          body: {},
          headers: { 'x-elastic-product': 'Elasticsearch' },
        })
      );
      mockCompatibility(true);

      setupContract = service.setup({
        elasticsearch: mockElasticsearchPreboot,
        connectionCheckInterval: ConfigSchema.validate({}).connectionCheck.interval,
      });
    });

    describe('#connectionStatus$', () => {
      beforeEach(() => jest.useFakeTimers());
      afterEach(() => jest.useRealTimers());

      it('does not repeat ping request if have multiple subscriptions', async () => {
        mockConnectionStatusClient.asInternalUser.ping.mockRejectedValue(
          new errors.ConnectionError(
            'some-message',
            interactiveSetupMock.createApiResponse({ body: {} })
          )
        );

        const mockHandler1 = jest.fn();
        const mockHandler2 = jest.fn();
        setupContract.connectionStatus$.subscribe(mockHandler1);
        setupContract.connectionStatus$.subscribe(mockHandler2);

        jest.advanceTimersByTime(0);
        await nextTick();

        // Late subscription.
        const mockHandler3 = jest.fn();
        setupContract.connectionStatus$.subscribe(mockHandler3);

        jest.advanceTimersByTime(100);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).toHaveBeenCalledTimes(1);
        expect(mockHandler1).toHaveBeenCalledTimes(1);
        expect(mockHandler1).toHaveBeenCalledWith(ElasticsearchConnectionStatus.NotConfigured);
        expect(mockHandler2).toHaveBeenCalledTimes(1);
        expect(mockHandler2).toHaveBeenCalledWith(ElasticsearchConnectionStatus.NotConfigured);
        expect(mockHandler3).toHaveBeenCalledTimes(1);
        expect(mockHandler3).toHaveBeenCalledWith(ElasticsearchConnectionStatus.NotConfigured);
      });

      it('does not report the same status twice', async () => {
        mockConnectionStatusClient.asInternalUser.ping.mockRejectedValue(
          new errors.ConnectionError(
            'some-message',
            interactiveSetupMock.createApiResponse({ body: {} })
          )
        );

        const mockHandler = jest.fn();
        setupContract.connectionStatus$.subscribe(mockHandler);

        jest.advanceTimersByTime(0);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledWith(ElasticsearchConnectionStatus.NotConfigured);

        mockHandler.mockClear();

        jest.advanceTimersByTime(5000);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).toHaveBeenCalledTimes(2);
        expect(mockHandler).not.toHaveBeenCalled();

        jest.advanceTimersByTime(5000);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).toHaveBeenCalledTimes(3);
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('stops status checks as soon as connection is known to be configured', async () => {
        mockConnectionStatusClient.asInternalUser.ping.mockRejectedValue(
          new errors.ConnectionError(
            'some-message',
            interactiveSetupMock.createApiResponse({ body: {} })
          )
        );

        const mockHandler = jest.fn();
        setupContract.connectionStatus$.subscribe(mockHandler);

        jest.advanceTimersByTime(0);
        await nextTick();

        // Initial ping (connection error).
        expect(mockConnectionStatusClient.asInternalUser.ping).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledWith(ElasticsearchConnectionStatus.NotConfigured);

        // Repeated ping (Unauthorized error).
        mockConnectionStatusClient.asInternalUser.ping.mockRejectedValue(
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({ statusCode: 401, body: {} })
          )
        );
        jest.advanceTimersByTime(5000);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).toHaveBeenCalledTimes(2);
        expect(mockHandler).toHaveBeenCalledTimes(2);
        expect(mockHandler).toHaveBeenCalledWith(ElasticsearchConnectionStatus.Configured);

        mockHandler.mockClear();
        mockConnectionStatusClient.asInternalUser.ping.mockClear();

        jest.advanceTimersByTime(5000);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).not.toHaveBeenCalled();
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('checks connection status only once if connection is known to be configured right from start', async () => {
        mockConnectionStatusClient.asInternalUser.ping.mockResponse(true);

        const mockHandler = jest.fn();
        setupContract.connectionStatus$.subscribe(mockHandler);

        jest.advanceTimersByTime(0);
        await nextTick();

        // Initial ping (connection error).
        expect(mockConnectionStatusClient.asInternalUser.ping).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledWith(ElasticsearchConnectionStatus.Configured);

        mockHandler.mockClear();
        mockConnectionStatusClient.asInternalUser.ping.mockClear();

        jest.advanceTimersByTime(5000);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).not.toHaveBeenCalled();
        expect(mockHandler).not.toHaveBeenCalled();

        const mockHandler2 = jest.fn();
        setupContract.connectionStatus$.subscribe(mockHandler2);

        // Source observable is complete, and handler should be called immediately.
        expect(mockHandler2).toHaveBeenCalledTimes(1);
        expect(mockHandler2).toHaveBeenCalledWith(ElasticsearchConnectionStatus.Configured);

        mockHandler2.mockClear();

        // No status check should be made after the first attempt.
        jest.advanceTimersByTime(5000);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).not.toHaveBeenCalled();
        expect(mockHandler).not.toHaveBeenCalled();
        expect(mockHandler2).not.toHaveBeenCalled();
      });

      it('does not check connection status if there are no subscribers', async () => {
        mockConnectionStatusClient.asInternalUser.ping.mockRejectedValue(
          new errors.ConnectionError(
            'some-message',
            interactiveSetupMock.createApiResponse({ body: {} })
          )
        );

        const mockHandler = jest.fn();
        const mockSubscription = setupContract.connectionStatus$.subscribe(mockHandler);

        jest.advanceTimersByTime(0);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledWith(ElasticsearchConnectionStatus.NotConfigured);

        mockSubscription.unsubscribe();
        mockHandler.mockClear();
        mockConnectionStatusClient.asInternalUser.ping.mockClear();

        jest.advanceTimersByTime(5000);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).not.toHaveBeenCalled();
        expect(mockHandler).not.toHaveBeenCalled();

        jest.advanceTimersByTime(5000);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).not.toHaveBeenCalled();
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('treats non-connection errors the same as successful response', async () => {
        mockConnectionStatusClient.asInternalUser.ping.mockRejectedValue(
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({ statusCode: 401, body: {} })
          )
        );

        const mockHandler = jest.fn();
        setupContract.connectionStatus$.subscribe(mockHandler);

        jest.advanceTimersByTime(0);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledWith(ElasticsearchConnectionStatus.Configured);

        mockHandler.mockClear();
        mockConnectionStatusClient.asInternalUser.ping.mockClear();

        jest.advanceTimersByTime(5000);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).not.toHaveBeenCalled();
        expect(mockHandler).not.toHaveBeenCalled();
      });

      it('treats product check error the same as successful response', async () => {
        mockConnectionStatusClient.asInternalUser.ping.mockRejectedValue(
          // @ts-expect-error not full interface
          new errors.ProductNotSupportedError('product-name', { body: {} })
        );

        const mockHandler = jest.fn();
        setupContract.connectionStatus$.subscribe(mockHandler);

        jest.advanceTimersByTime(0);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledTimes(1);
        expect(mockHandler).toHaveBeenCalledWith(ElasticsearchConnectionStatus.Configured);

        mockHandler.mockClear();
        mockConnectionStatusClient.asInternalUser.ping.mockClear();

        jest.advanceTimersByTime(5000);
        await nextTick();

        expect(mockConnectionStatusClient.asInternalUser.ping).not.toHaveBeenCalled();
        expect(mockHandler).not.toHaveBeenCalled();
      });
    });

    describe('#enroll()', () => {
      it('fails if enroll call fails', async () => {
        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.asCurrentUser.transport.request.mockRejectedValue(
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({ statusCode: 401, body: { message: 'oh no' } })
          )
        );
        mockEnrollClient.asScoped.mockReturnValue(mockScopedClusterClient);

        await expect(
          setupContract.enroll({ apiKey: 'apiKey', hosts: ['host1'], caFingerprint: 'DE:AD:BE:EF' })
        ).rejects.toMatchInlineSnapshot(`[ResponseError: {"message":"oh no"}]`);

        expect(mockEnrollClient.asScoped).toHaveBeenCalledTimes(1);
        expect(mockEnrollClient.close).toHaveBeenCalledTimes(1);
        expect(mockAuthenticateClient.asInternalUser.security.authenticate).not.toHaveBeenCalled();
      });

      it('fails if none of the hosts are accessible', async () => {
        const mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockScopedClusterClient.asCurrentUser.transport.request.mockRejectedValue(
          new errors.ConnectionError(
            'some-message',
            interactiveSetupMock.createApiResponse({ body: {} })
          )
        );
        mockEnrollClient.asScoped.mockReturnValue(mockScopedClusterClient);

        await expect(
          setupContract.enroll({
            apiKey: 'apiKey',
            hosts: ['host1', 'host2'],
            caFingerprint: 'DE:AD:BE:EF',
          })
        ).rejects.toMatchInlineSnapshot(`[Error: Unable to connect to any of the provided hosts.]`);

        expect(mockEnrollClient.close).toHaveBeenCalledTimes(2);
        expect(mockAuthenticateClient.asInternalUser.security.authenticate).not.toHaveBeenCalled();
      });

      it('fails if authenticate call fails', async () => {
        const mockEnrollScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockEnrollScopedClusterClient.asCurrentUser.transport.request.mockResolvedValue(
          interactiveSetupMock.createApiResponse({
            statusCode: 200,
            body: { token: { name: 'some-name', value: 'some-value' }, http_ca: 'some-ca' },
          })
        );
        mockEnrollClient.asScoped.mockReturnValue(mockEnrollScopedClusterClient);

        mockAuthenticateClient.asInternalUser.security.authenticate.mockRejectedValue(
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({ statusCode: 401, body: { message: 'oh no' } })
          )
        );

        await expect(
          setupContract.enroll({ apiKey: 'apiKey', hosts: ['host1'], caFingerprint: 'DE:AD:BE:EF' })
        ).rejects.toMatchInlineSnapshot(`[ResponseError: {"message":"oh no"}]`);

        expect(mockEnrollClient.asScoped).toHaveBeenCalledTimes(1);
        expect(mockEnrollClient.close).toHaveBeenCalledTimes(1);
        expect(mockAuthenticateClient.asInternalUser.security.authenticate).toHaveBeenCalledTimes(
          1
        );
        expect(mockAuthenticateClient.close).toHaveBeenCalledTimes(1);
      });

      it('fails if version is incompatible', async () => {
        const mockEnrollScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
        mockEnrollScopedClusterClient.asCurrentUser.transport.request.mockResolvedValue(
          interactiveSetupMock.createApiResponse({
            statusCode: 200,
            body: {
              token: { name: 'some-name', value: 'some-value' },
              http_ca: '\n\nsome weird-ca_with\n content\n\n',
            },
          })
        );
        mockEnrollClient.asScoped.mockReturnValue(mockEnrollScopedClusterClient);

        mockAuthenticateClient.asInternalUser.security.authenticate.mockResponse({} as any, {
          statusCode: 200,
        });

        mockCompatibility(false, 'Oh no!');

        await expect(
          setupContract.enroll({
            apiKey: 'apiKey',
            hosts: ['host1', 'host2'],
            caFingerprint: 'DE:AD:BE:EF',
          })
        ).rejects.toMatchInlineSnapshot(`[CompatibilityError: Oh no!]`);

        // Check that we properly closed all clients.
        expect(mockEnrollClient.close).toHaveBeenCalledTimes(1);
        expect(mockAuthenticateClient.close).toHaveBeenCalledTimes(1);
      });

      it('iterates through all provided hosts until find an accessible one', async () => {
        mockElasticsearchPreboot.createClient.mockClear();

        const mockHostOneEnrollScopedClusterClient =
          elasticsearchServiceMock.createScopedClusterClient();
        mockHostOneEnrollScopedClusterClient.asCurrentUser.transport.request.mockRejectedValue(
          new errors.ConnectionError(
            'some-message',
            interactiveSetupMock.createApiResponse({ body: {} })
          )
        );

        const mockHostTwoEnrollScopedClusterClient =
          elasticsearchServiceMock.createScopedClusterClient();
        mockHostTwoEnrollScopedClusterClient.asCurrentUser.transport.request.mockResolvedValue(
          interactiveSetupMock.createApiResponse({
            statusCode: 200,
            body: {
              token: { name: 'some-name', value: 'some-value' },
              http_ca: '\n\nsome weird-ca_with\n content\n\n',
            },
          })
        );

        mockEnrollClient.asScoped
          .mockReturnValueOnce(mockHostOneEnrollScopedClusterClient)
          .mockReturnValueOnce(mockHostTwoEnrollScopedClusterClient);

        mockAuthenticateClient.asInternalUser.security.authenticate.mockResponse({} as any, {
          statusCode: 200,
        });

        const expectedCa = `-----BEGIN CERTIFICATE-----


some weird+ca/with

 content


-----END CERTIFICATE-----
`;

        await expect(
          setupContract.enroll({
            apiKey: 'apiKey',
            hosts: ['host1', 'host2'],
            caFingerprint: 'DE:AD:BE:EF',
          })
        ).resolves.toEqual({
          caCert: expectedCa,
          host: 'host2',
          serviceAccountToken: {
            name: 'some-name',
            value: 'some-value',
          },
        });

        // Check that we created clients with the right parameters
        expect(mockElasticsearchPreboot.createClient).toHaveBeenCalledTimes(3);
        expect(mockElasticsearchPreboot.createClient).toHaveBeenCalledWith('enroll', {
          caFingerprint: 'DE:AD:BE:EF',
          hosts: ['host1'],
          ssl: { verificationMode: 'none' },
        });
        expect(mockElasticsearchPreboot.createClient).toHaveBeenCalledWith('enroll', {
          caFingerprint: 'DE:AD:BE:EF',
          hosts: ['host2'],
          ssl: { verificationMode: 'none' },
        });
        expect(mockElasticsearchPreboot.createClient).toHaveBeenCalledWith('authenticate', {
          caFingerprint: 'DE:AD:BE:EF',
          hosts: ['host2'],
          serviceAccountToken: 'some-value',
          ssl: { certificateAuthorities: [expectedCa] },
        });

        // Check that we properly provided apiKeys to scoped clients.
        expect(mockEnrollClient.asScoped).toHaveBeenCalledTimes(2);
        expect(mockEnrollClient.asScoped).toHaveBeenNthCalledWith(1, {
          headers: { authorization: 'ApiKey apiKey' },
        });
        expect(mockEnrollClient.asScoped).toHaveBeenNthCalledWith(2, {
          headers: { authorization: 'ApiKey apiKey' },
        });

        // Check that we properly called all required ES APIs.
        expect(
          mockHostOneEnrollScopedClusterClient.asCurrentUser.transport.request
        ).toHaveBeenCalledTimes(1);
        expect(
          mockHostOneEnrollScopedClusterClient.asCurrentUser.transport.request
        ).toHaveBeenCalledWith(
          {
            method: 'GET',
            path: '/_security/enroll/kibana',
          },
          { meta: true }
        );
        expect(
          mockHostTwoEnrollScopedClusterClient.asCurrentUser.transport.request
        ).toHaveBeenCalledTimes(1);
        expect(
          mockHostTwoEnrollScopedClusterClient.asCurrentUser.transport.request
        ).toHaveBeenCalledWith(
          {
            method: 'GET',
            path: '/_security/enroll/kibana',
          },
          { meta: true }
        );
        expect(mockAuthenticateClient.asInternalUser.security.authenticate).toHaveBeenCalledTimes(
          1
        );

        // Check that we properly closed all clients.
        expect(mockEnrollClient.close).toHaveBeenCalledTimes(2);
        expect(mockAuthenticateClient.close).toHaveBeenCalledTimes(1);
      });
    });

    describe('#authenticate()', () => {
      it('fails if ping call fails', async () => {
        mockAuthenticateClient.asInternalUser.ping.mockRejectedValue(
          new errors.ConnectionError(
            'some-message',
            interactiveSetupMock.createApiResponse({ body: {} })
          )
        );

        await expect(
          setupContract.authenticate({ host: 'http://localhost:9200' })
        ).rejects.toMatchInlineSnapshot(`[ConnectionError: some-message]`);
        expect(mockAuthenticateClient.close).toHaveBeenCalledTimes(1);
      });

      it('fails if version is incompatible', async () => {
        mockAuthenticateClient.asInternalUser.ping.mockResponse(true);

        mockCompatibility(false, 'Oh no!');

        await expect(
          setupContract.authenticate({ host: 'http://localhost:9200' })
        ).rejects.toMatchInlineSnapshot(`[CompatibilityError: Oh no!]`);
        expect(mockAuthenticateClient.close).toHaveBeenCalledTimes(1);
      });

      it('succeeds if ping call succeeds', async () => {
        mockAuthenticateClient.asInternalUser.ping.mockResponse(true);

        await expect(
          setupContract.authenticate({ host: 'http://localhost:9200' })
        ).resolves.toEqual(undefined);
        expect(mockAuthenticateClient.close).toHaveBeenCalledTimes(1);
      });
    });

    describe('#ping()', () => {
      it('fails if host is not reachable', async () => {
        mockPingClient.asInternalUser.ping.mockRejectedValue(
          new errors.ConnectionError(
            'some-message',
            interactiveSetupMock.createApiResponse({ body: {} })
          )
        );

        await expect(setupContract.ping('http://localhost:9200')).rejects.toMatchInlineSnapshot(
          `[ConnectionError: some-message]`
        );
        expect(mockPingClient.close).toHaveBeenCalledTimes(1);
      });

      it('fails if host is not supported', async () => {
        mockPingClient.asInternalUser.ping.mockRejectedValue(
          // @ts-expect-error not full interface
          new errors.ProductNotSupportedError('Elasticsearch', { body: {} })
        );

        await expect(setupContract.ping('http://localhost:9200')).rejects.toMatchInlineSnapshot(
          `[ProductNotSupportedError: The client noticed that the server is not Elasticsearch and we do not support this unknown product.]`
        );
        expect(mockPingClient.close).toHaveBeenCalledTimes(1);
      });

      it('fails if host is not Elasticsearch', async () => {
        mockAuthenticateClient.asInternalUser.ping.mockResponse(true);

        mockPingClient.asInternalUser.transport.request.mockResolvedValue(
          interactiveSetupMock.createApiResponse({ statusCode: 200, body: {}, headers: {} })
        );

        await expect(setupContract.ping('http://localhost:9200')).rejects.toMatchInlineSnapshot(
          `[Error: Host did not respond with valid Elastic product header.]`
        );
        expect(mockPingClient.close).toHaveBeenCalledTimes(1);
      });

      it('succeeds if host does not require authentication', async () => {
        mockAuthenticateClient.asInternalUser.ping.mockResponse(true);

        await expect(setupContract.ping('http://localhost:9200')).resolves.toEqual({
          authRequired: false,
          certificateChain: undefined,
        });
        expect(mockPingClient.close).toHaveBeenCalledTimes(1);
      });

      it('succeeds if host requires authentication', async () => {
        mockPingClient.asInternalUser.ping.mockRejectedValue(
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({ statusCode: 401, body: {} })
          )
        );

        await expect(setupContract.ping('http://localhost:9200')).resolves.toEqual({
          authRequired: true,
          certificateChain: undefined,
        });
        expect(mockPingClient.close).toHaveBeenCalledTimes(1);
      });

      it('succeeds if host requires SSL', async () => {
        mockPingClient.asInternalUser.ping.mockRejectedValue(
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({ statusCode: 401, body: {} })
          )
        );

        tlsConnectMock.mockReturnValue({
          once: jest.fn((event, fn) => {
            if (event === 'secureConnect') {
              fn();
            }
          }),
          getPeerCertificate: jest.fn().mockReturnValue({ raw: Buffer.from('cert') }),
          destroy: jest.fn(),
        } as unknown as tls.TLSSocket);

        await expect(setupContract.ping('https://localhost:9200')).resolves.toEqual({
          authRequired: true,
          certificateChain: [
            expect.objectContaining({
              raw: 'Y2VydA==',
            }),
          ],
        });

        expect(tlsConnectMock).toHaveBeenCalledWith({
          host: 'localhost',
          port: 9200,
          rejectUnauthorized: false,
        });
        expect(mockPingClient.close).toHaveBeenCalledTimes(1);
      });

      it('fails if peer certificate cannot be fetched', async () => {
        mockPingClient.asInternalUser.ping.mockRejectedValue(
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({ statusCode: 401, body: {} })
          )
        );

        tlsConnectMock.mockReturnValue({
          once: jest.fn((event, fn) => {
            if (event === 'error') {
              fn(new Error('some-message'));
            }
          }),
        } as unknown as tls.TLSSocket);

        await expect(setupContract.ping('https://localhost:9200')).rejects.toMatchInlineSnapshot(
          `[Error: some-message]`
        );
        expect(mockPingClient.close).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('#stop()', () => {
    it('does not fail if called before `setup`', () => {
      expect(() => service.stop()).not.toThrow();
    });

    it('closes connection status check client', async () => {
      const mockConnectionStatusClient = elasticsearchServiceMock.createCustomClusterClient();
      mockElasticsearchPreboot.createClient.mockImplementation((type) => {
        switch (type) {
          case 'connectionStatus':
            return mockConnectionStatusClient;
          default:
            throw new Error(`Unexpected client type: ${type}`);
        }
      });

      service.setup({
        elasticsearch: mockElasticsearchPreboot,
        connectionCheckInterval: ConfigSchema.validate({}).connectionCheck.interval,
      });
      service.stop();

      expect(mockConnectionStatusClient.close).toHaveBeenCalled();
    });
  });
});
