/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConfigSchema, ParamsSchema, HeadersSchema } from './v1';

describe('Webhook Schema', () => {
  describe('HeadersSchema', () => {
    it('validates valid headers', () => {
      expect(() =>
        HeadersSchema.parse({
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Custom-Header': 'value',
        })
      ).not.toThrow();
    });

    it('validates empty object', () => {
      expect(() => HeadersSchema.parse({})).not.toThrow();
    });
  });

  describe('ConfigSchema', () => {
    it('validates with url only', () => {
      expect(() =>
        ConfigSchema.parse({
          url: 'https://api.example.com/webhook',
        })
      ).not.toThrow();
    });

    it('applies default method to POST', () => {
      const result = ConfigSchema.parse({
        url: 'https://api.example.com/webhook',
      });
      expect(result.method).toBe('post');
    });

    it('applies default hasAuth to true', () => {
      const result = ConfigSchema.parse({
        url: 'https://api.example.com/webhook',
      });
      expect(result.hasAuth).toBe(true);
    });

    it('validates all HTTP methods', () => {
      const methods = ['post', 'put', 'patch', 'get', 'delete'];
      methods.forEach((method) => {
        expect(() =>
          ConfigSchema.parse({
            url: 'https://api.example.com/webhook',
            method,
          })
        ).not.toThrow();
      });
    });

    it('throws on invalid HTTP method', () => {
      expect(() =>
        ConfigSchema.parse({
          url: 'https://api.example.com/webhook',
          method: 'invalid',
        })
      ).toThrow();
    });

    it('validates with headers', () => {
      expect(() =>
        ConfigSchema.parse({
          url: 'https://api.example.com/webhook',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer token',
          },
        })
      ).not.toThrow();
    });

    it('validates with null headers', () => {
      expect(() =>
        ConfigSchema.parse({
          url: 'https://api.example.com/webhook',
          headers: null,
        })
      ).not.toThrow();
    });

    it('validates with auth configuration', () => {
      expect(() =>
        ConfigSchema.parse({
          url: 'https://api.example.com/webhook',
          hasAuth: true,
          authType: 'webhook-authentication-basic',
          certType: 'ssl-crt-key',
          ca: 'ca-certificate',
          verificationMode: 'full',
        })
      ).not.toThrow();
    });

    it('validates with OAuth2 configuration', () => {
      expect(() =>
        ConfigSchema.parse({
          url: 'https://api.example.com/webhook',
          hasAuth: true,
          authType: 'webhook-oauth2-client-credentials',
          accessTokenUrl: 'https://auth.example.com/token',
          clientId: 'client-123',
          scope: 'read write',
        })
      ).not.toThrow();
    });

    it('validates verificationMode values', () => {
      const modes = ['none', 'certificate', 'full'];
      modes.forEach((mode) => {
        expect(() =>
          ConfigSchema.parse({
            url: 'https://api.example.com/webhook',
            verificationMode: mode,
          })
        ).not.toThrow();
      });
    });

    it('throws when url is missing', () => {
      expect(() => ConfigSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ConfigSchema.parse({
          url: 'https://api.example.com/webhook',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ParamsSchema', () => {
    it('validates with body', () => {
      expect(() =>
        ParamsSchema.parse({
          body: '{"data": "test"}',
        })
      ).not.toThrow();
    });

    it('validates empty object', () => {
      expect(() => ParamsSchema.parse({})).not.toThrow();
    });

    it('validates with empty body', () => {
      expect(() =>
        ParamsSchema.parse({
          body: '',
        })
      ).not.toThrow();
    });

    it('validates without body', () => {
      expect(() => ParamsSchema.parse({})).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ParamsSchema.parse({
          body: '{}',
          unknownProp: 'value',
        })
      ).toThrow();
    });

    it('validates with JSON body', () => {
      expect(() =>
        ParamsSchema.parse({
          body: JSON.stringify({
            event: 'alert',
            data: { key: 'value' },
          }),
        })
      ).not.toThrow();
    });

    it('validates with non-JSON body', () => {
      expect(() =>
        ParamsSchema.parse({
          body: 'plain text body',
        })
      ).not.toThrow();
    });
  });
});
