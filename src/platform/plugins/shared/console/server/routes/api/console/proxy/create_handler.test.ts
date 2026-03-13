/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { duration } from 'moment';
import { kibanaResponseFactory } from '@kbn/core/server';
import { getProxyRouteHandlerDeps } from './mocks';
import { createResponseStub } from './stubs';
import * as requestModule from '../../../../lib/proxy_request';
import { createHandler } from './create_handler';
import { routeValidationConfig } from './validation_config';

describe('Console Proxy Route - Crete Handler', () => {
  describe('host validation', () => {
    beforeEach(() => {
      (requestModule.proxyRequest as jest.Mock).mockResolvedValue(createResponseStub(''));
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('rejects requests to hosts not in the configured allowlist', async () => {
      const handler = createHandler(getProxyRouteHandlerDeps({}));
      const response = await handler(
        {} as any,
        {
          headers: {},
          query: { method: 'GET', path: '/', host: 'http://attacker.com:8080' },
        } as any,
        kibanaResponseFactory
      );
      expect(response.status).toBe(400);
    });

    it('accepts an allowlisted host even if the stored value differs only by trailing slash', async () => {
      const handler = createHandler(getProxyRouteHandlerDeps({}));
      // The configured host is http://localhost:9200 (no trailing slash).
      // After URL normalisation it becomes http://localhost:9200/.
      // A client that stored the old (pre-normalisation) value should still match.
      const response = await handler(
        {} as any,
        {
          headers: {},
          query: { method: 'GET', path: '/', host: 'http://localhost:9200' },
        } as any,
        kibanaResponseFactory
      );
      expect(response.status).toBe(200);
    });

    it('uses the original configured host (with credentials) for the upstream request', async () => {
      const handler = createHandler(
        getProxyRouteHandlerDeps({
          proxy: {
            readLegacyESConfig: async () => ({
              requestTimeout: duration(30000),
              customHeaders: {},
              requestHeadersWhitelist: [],
              hosts: ['http://kibana_system:SECRET@localhost:9200'],
            }),
          },
        })
      );
      const response = await handler(
        {} as any,
        {
          headers: {},
          query: { method: 'GET', path: '/', host: 'http://localhost:9200/' },
        } as any,
        kibanaResponseFactory
      );
      expect(response.status).toBe(200);
      const [[args]] = (requestModule.proxyRequest as jest.Mock).mock.calls;
      expect(args.uri.href).toContain('kibana_system:SECRET');
    });
  });

  describe('route validation config', () => {
    it('should accept host parameter in query schema', () => {
      const validQuery = {
        method: 'GET',
        path: '/_cat/indices',
        host: 'http://custom-host:9200',
      };

      // This should not throw
      expect(() => routeValidationConfig.query.validate(validQuery)).not.toThrow();
    });

    it('should accept query without host parameter', () => {
      const validQuery = {
        method: 'GET',
        path: '/_cat/indices',
      };

      // This should not throw
      expect(() => routeValidationConfig.query.validate(validQuery)).not.toThrow();
    });

    it('should accept host parameter alongside other query parameters', () => {
      const validQuery = {
        method: 'POST',
        path: '/test-index/_doc',
        host: 'http://custom-host:9200',
        withProductOrigin: true,
      };

      // This should not throw
      expect(() => routeValidationConfig.query.validate(validQuery)).not.toThrow();
    });

    it('should validate the host parameter as optional string', () => {
      const queryWithEmptyHost = {
        method: 'GET',
        path: '/_cat/indices',
        host: '',
      };

      // Empty string should be valid (it's a string)
      expect(() => routeValidationConfig.query.validate(queryWithEmptyHost)).not.toThrow();
    });
  });
});
