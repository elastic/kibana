/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from './connector_spec';
import {
  GENERIC_REQUEST_SUB_ACTION,
  GenericRequestInputSchema,
  GenericRequestUrlOnlyInputSchema,
  getGenericRequestInputSchema,
  buildGenericRequestHandler,
  resolveGenericRequestUrl,
} from './generic_request';

describe('generic_request', () => {
  describe('GENERIC_REQUEST_SUB_ACTION', () => {
    it('is "request"', () => {
      expect(GENERIC_REQUEST_SUB_ACTION).toBe('request');
    });
  });

  describe('GenericRequestInputSchema', () => {
    it('defaults method to "get" and allows a path', () => {
      const parsed = GenericRequestInputSchema.parse({ path: '/v0/foo' });
      expect(parsed).toEqual({ method: 'get', path: '/v0/foo' });
    });

    it('allows an absolute url instead of a path', () => {
      const parsed = GenericRequestInputSchema.parse({ url: 'https://api.example.com/v0/foo' });
      expect(parsed).toEqual({ method: 'get', url: 'https://api.example.com/v0/foo' });
    });

    it('accepts body, headers and query', () => {
      const input = {
        method: 'post' as const,
        path: '/v0/foo',
        body: { a: 1 },
        headers: { 'X-Test': 'yes' },
        query: { limit: 10, active: true, name: 'x' },
      };
      expect(GenericRequestInputSchema.parse(input)).toEqual(input);
    });

    it('rejects unknown properties', () => {
      expect(() =>
        GenericRequestInputSchema.parse({ path: '/v0/foo', unexpected: true })
      ).toThrow();
    });

    it('rejects an unsupported method', () => {
      expect(() =>
        GenericRequestInputSchema.parse({ method: 'options', path: '/v0/foo' })
      ).toThrow();
    });

    it('allows neither path nor url at the schema level (enforced at resolution time)', () => {
      expect(() => GenericRequestInputSchema.parse({ method: 'get' })).not.toThrow();
    });
  });

  describe('GenericRequestUrlOnlyInputSchema', () => {
    it('requires an absolute url', () => {
      const parsed = GenericRequestUrlOnlyInputSchema.parse({
        url: 'https://api.example.com/foo',
      });
      expect(parsed).toEqual({ method: 'get', url: 'https://api.example.com/foo' });
    });

    it('rejects a path', () => {
      expect(() =>
        GenericRequestUrlOnlyInputSchema.parse({ path: '/foo', url: 'https://api.example.com' })
      ).toThrow();
    });

    it('rejects a missing url', () => {
      expect(() => GenericRequestUrlOnlyInputSchema.parse({ method: 'get' })).toThrow();
    });
  });

  describe('getGenericRequestInputSchema', () => {
    it('returns the path-capable schema when the connector has a base URL', () => {
      expect(getGenericRequestInputSchema(true)).toBe(GenericRequestInputSchema);
    });

    it('returns the url-only schema when the connector has no base URL', () => {
      expect(getGenericRequestInputSchema(false)).toBe(GenericRequestUrlOnlyInputSchema);
    });
  });

  describe('resolveGenericRequestUrl', () => {
    const ctx = { config: { baseUrl: 'https://api.example.com' } } as unknown as ActionContext;
    const getBaseUrl = (c: ActionContext) => (c.config as { baseUrl: string }).baseUrl;

    it('uses url verbatim when provided, overriding path and base URL', () => {
      expect(
        resolveGenericRequestUrl(
          ctx,
          { url: 'https://other.example.com/x', path: '/v0/ignored' },
          getBaseUrl
        )
      ).toBe('https://other.example.com/x');
    });

    it('joins base URL and path when only a path is provided', () => {
      expect(resolveGenericRequestUrl(ctx, { path: '/v0/things' }, getBaseUrl)).toBe(
        'https://api.example.com/v0/things'
      );
    });

    it('normalizes a leading-slash-less path and trailing base slashes', () => {
      expect(
        resolveGenericRequestUrl(ctx, { path: 'v0/things' }, () => 'https://api.example.com///')
      ).toBe('https://api.example.com/v0/things');
    });

    it('throws when neither url nor path is provided', () => {
      expect(() => resolveGenericRequestUrl(ctx, {}, getBaseUrl)).toThrow(/Either "url" or "path"/);
    });

    it('throws when a path is provided but the connector has no getBaseUrl', () => {
      expect(() => resolveGenericRequestUrl(ctx, { path: '/v0/things' }, undefined)).toThrow(
        /does not support relative "path"/
      );
    });

    it('allows url on a connector without getBaseUrl', () => {
      expect(resolveGenericRequestUrl(ctx, { url: 'https://api.example.com/x' }, undefined)).toBe(
        'https://api.example.com/x'
      );
    });
  });

  describe('buildGenericRequestHandler', () => {
    const createCtx = (requestResult: unknown): ActionContext => {
      const request = jest.fn().mockResolvedValue(requestResult);
      return {
        client: { request } as unknown as ActionContext['client'],
        config: { baseUrl: 'https://api.example.com' },
        log: { debug: jest.fn(), error: jest.fn() } as unknown as ActionContext['log'],
      } as ActionContext;
    };

    it('joins base URL and path, forwards method/body/headers/query, and shapes the output', async () => {
      const ctx = createCtx({
        status: 201,
        headers: { 'content-type': 'application/json' },
        data: { id: 'abc' },
      });
      const handler = buildGenericRequestHandler((c) => (c.config as { baseUrl: string }).baseUrl);

      const output = await handler(ctx, {
        method: 'post',
        path: '/v0/things',
        body: { name: 'x' },
        headers: { 'X-Test': '1' },
        query: { limit: 5 },
      });

      expect(ctx.client.request as jest.Mock).toHaveBeenCalledWith({
        method: 'post',
        url: 'https://api.example.com/v0/things',
        data: { name: 'x' },
        headers: { 'X-Test': '1' },
        params: { limit: 5 },
      });
      expect(output).toEqual({
        status: 201,
        headers: { 'content-type': 'application/json' },
        data: { id: 'abc' },
      });
    });

    it('uses an absolute url verbatim', async () => {
      const ctx = createCtx({ status: 200, headers: {}, data: {} });
      const handler = buildGenericRequestHandler((c) => (c.config as { baseUrl: string }).baseUrl);

      await handler(ctx, { method: 'get', url: 'https://other.example.com/raw' });

      expect(ctx.client.request as jest.Mock).toHaveBeenCalledWith({
        method: 'get',
        url: 'https://other.example.com/raw',
      });
    });

    it('works with a url even when the connector has no getBaseUrl', async () => {
      const ctx = createCtx({ status: 200, headers: {}, data: {} });
      const handler = buildGenericRequestHandler(undefined);

      await handler(ctx, { method: 'get', url: 'https://api.example.com/raw' });

      expect(ctx.client.request as jest.Mock).toHaveBeenCalledWith({
        method: 'get',
        url: 'https://api.example.com/raw',
      });
    });

    it('omits data/headers/params when not provided', async () => {
      const ctx = createCtx({ status: 200, headers: {}, data: {} });
      const handler = buildGenericRequestHandler(() => 'https://api.example.com');

      await handler(ctx, { method: 'get', path: '/v0/things' });

      expect(ctx.client.request as jest.Mock).toHaveBeenCalledWith({
        method: 'get',
        url: 'https://api.example.com/v0/things',
      });
    });

    describe('allowedHosts enforcement', () => {
      it('validates the resolved absolute url against the allowlist before requesting', async () => {
        const ctx = createCtx({ status: 200, headers: {}, data: {} });
        const ensureUriAllowed = jest.fn();
        ctx.ensureUriAllowed = ensureUriAllowed;
        const handler = buildGenericRequestHandler(() => 'https://api.example.com');

        await handler(ctx, { method: 'get', url: 'https://other.example.com/raw' });

        expect(ensureUriAllowed).toHaveBeenCalledWith('https://other.example.com/raw');
        expect(ctx.client.request as jest.Mock).toHaveBeenCalled();
      });

      it('validates the resolved base-url + path against the allowlist', async () => {
        const ctx = createCtx({ status: 200, headers: {}, data: {} });
        const ensureUriAllowed = jest.fn();
        ctx.ensureUriAllowed = ensureUriAllowed;
        const handler = buildGenericRequestHandler(() => 'https://api.example.com');

        await handler(ctx, { method: 'get', path: '/v0/things' });

        expect(ensureUriAllowed).toHaveBeenCalledWith('https://api.example.com/v0/things');
      });

      it('does not send the request when the host is not allowed', async () => {
        const ctx = createCtx({ status: 200, headers: {}, data: {} });
        ctx.ensureUriAllowed = jest.fn(() => {
          throw new Error(
            'target url "https://evil.example.com/steal" is not added to the Kibana config'
          );
        });
        const handler = buildGenericRequestHandler(() => 'https://api.example.com');

        await expect(
          handler(ctx, { method: 'get', url: 'https://evil.example.com/steal' })
        ).rejects.toThrow('is not added to the Kibana config');
        expect(ctx.client.request as jest.Mock).not.toHaveBeenCalled();
      });
    });
  });
});
