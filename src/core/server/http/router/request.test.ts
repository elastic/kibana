/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
}));

import { RouteOptions } from '@hapi/hapi';
import { KibanaRequest } from './request';
import { httpServerMock } from '../http_server.mocks';
import { schema } from '@kbn/config-schema';

describe('KibanaRequest', () => {
  describe('id property', () => {
    it('uses the request.app.requestId property if present', () => {
      const request = httpServerMock.createRawRequest({
        app: { requestId: 'fakeId' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.id).toEqual('fakeId');
    });

    it('generates a new UUID if request.app property is not present', () => {
      // Undefined app property
      const request = httpServerMock.createRawRequest({
        app: undefined,
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.id).toEqual('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    });

    it('generates a new UUID if request.app.requestId property is not present', () => {
      // Undefined app.requestId property
      const request = httpServerMock.createRawRequest({
        app: {},
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.id).toEqual('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    });
  });

  describe('uuid property', () => {
    it('uses the request.app.requestUuid property if present', () => {
      const request = httpServerMock.createRawRequest({
        app: { requestUuid: '123e4567-e89b-12d3-a456-426614174000' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.uuid).toEqual('123e4567-e89b-12d3-a456-426614174000');
    });

    it('generates a new UUID if request.app property is not present', () => {
      // Undefined app property
      const request = httpServerMock.createRawRequest({
        app: undefined,
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.uuid).toEqual('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    });

    it('generates a new UUID if request.app.requestUuid property is not present', () => {
      // Undefined app.requestUuid property
      const request = httpServerMock.createRawRequest({
        app: {},
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.uuid).toEqual('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    });
  });

  describe('get all headers', () => {
    it('returns all headers', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one', authorization: 'token' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.headers).toEqual({ custom: 'one', authorization: 'token' });
    });
  });

  describe('headers property', () => {
    it('provides a frozen copy of request headers', () => {
      const rawRequestHeaders = { custom: 'one' };
      const request = httpServerMock.createRawRequest({
        headers: rawRequestHeaders,
      });
      const kibanaRequest = KibanaRequest.from(request);

      expect(kibanaRequest.headers).toEqual({ custom: 'one' });
      expect(kibanaRequest.headers).not.toBe(rawRequestHeaders);
      expect(Object.isFrozen(kibanaRequest.headers)).toBe(true);
    });

    it.skip("doesn't expose authorization header by default", () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one', authorization: 'token' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.headers).toEqual({
        custom: 'one',
      });
    });

    it('exposes authorization header if secured = false', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one', authorization: 'token' },
      });
      const kibanaRequest = KibanaRequest.from(request, undefined, false);
      expect(kibanaRequest.headers).toEqual({
        custom: 'one',
        authorization: 'token',
      });
    });
  });

  describe('isSytemApi property', () => {
    it('is false when no kbn-system-request header is set', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.isSystemRequest).toBe(false);
    });

    it('is true when kbn-system-request header is set to true', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one', 'kbn-system-request': 'true' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.isSystemRequest).toBe(true);
    });

    it('is false when kbn-system-request header is set to false', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one', 'kbn-system-request': 'false' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.isSystemRequest).toBe(false);
    });

    // Remove support for kbn-system-api header in 8.x. Only used by legacy platform.
    it('is false when no kbn-system-api header is set', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.isSystemRequest).toBe(false);
    });

    it('is true when kbn-system-api header is set to true', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one', 'kbn-system-api': 'true' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.isSystemRequest).toBe(true);
    });

    it('is false when kbn-system-api header is set to false', () => {
      const request = httpServerMock.createRawRequest({
        headers: { custom: 'one', 'kbn-system-api': 'false' },
      });
      const kibanaRequest = KibanaRequest.from(request);
      expect(kibanaRequest.isSystemRequest).toBe(false);
    });
  });

  describe('route.options.authRequired property', () => {
    it('handles required auth: undefined', () => {
      const auth: RouteOptions['auth'] = undefined;
      const request = httpServerMock.createRawRequest({
        route: {
          settings: {
            auth,
          },
        },
      });
      const kibanaRequest = KibanaRequest.from(request);

      expect(kibanaRequest.route.options.authRequired).toBe(true);
    });
    it('handles required auth: false', () => {
      const auth: RouteOptions['auth'] = false;
      const request = httpServerMock.createRawRequest({
        route: {
          settings: {
            // @ts-expect-error According to types/hapi__hapi, `auth` can't be a boolean, but it can according to the @hapi/hapi source (https://github.com/hapijs/hapi/blob/v18.4.2/lib/route.js#L139)
            auth,
          },
        },
      });
      const kibanaRequest = KibanaRequest.from(request);

      expect(kibanaRequest.route.options.authRequired).toBe(false);
    });
    it('handles required auth: { mode: "required" }', () => {
      const request = httpServerMock.createRawRequest({
        route: {
          settings: {
            auth: { mode: 'required' },
          },
        },
      });
      const kibanaRequest = KibanaRequest.from(request);

      expect(kibanaRequest.route.options.authRequired).toBe(true);
    });

    it('handles required auth: { mode: "optional" }', () => {
      const request = httpServerMock.createRawRequest({
        route: {
          settings: {
            auth: { mode: 'optional' },
          },
        },
      });
      const kibanaRequest = KibanaRequest.from(request);

      expect(kibanaRequest.route.options.authRequired).toBe('optional');
    });

    it('handles required auth: { mode: "try" } as "optional"', () => {
      const request = httpServerMock.createRawRequest({
        route: {
          settings: {
            auth: { mode: 'try' },
          },
        },
      });
      const kibanaRequest = KibanaRequest.from(request);

      expect(kibanaRequest.route.options.authRequired).toBe('optional');
    });

    it('throws on auth: strategy name', () => {
      const request = httpServerMock.createRawRequest({
        route: {
          settings: {
            auth: { strategies: ['session'] },
          },
        },
      });

      expect(() => KibanaRequest.from(request)).toThrowErrorMatchingInlineSnapshot(
        `"unexpected authentication options: {\\"strategies\\":[\\"session\\"]} for route: /"`
      );
    });

    it('throws on auth: { mode: unexpected mode }', () => {
      const request = httpServerMock.createRawRequest({
        route: {
          settings: {
            auth: { mode: undefined },
          },
        },
      });

      expect(() => KibanaRequest.from(request)).toThrowErrorMatchingInlineSnapshot(
        `"unexpected authentication options: {} for route: /"`
      );
    });
  });

  describe('RouteSchema type inferring', () => {
    it('should work with config-schema', () => {
      const body = Buffer.from('body!');
      const request = {
        ...httpServerMock.createRawRequest({
          params: { id: 'params' },
          query: { search: 'query' },
        }),
        payload: body, // Set outside because the mock is using `merge` by lodash and breaks the Buffer into arrays
      } as any;
      const kibanaRequest = KibanaRequest.from(request, {
        params: schema.object({ id: schema.string() }),
        query: schema.object({ search: schema.string() }),
        body: schema.buffer(),
      });
      expect(kibanaRequest.params).toStrictEqual({ id: 'params' });
      expect(kibanaRequest.params.id.toUpperCase()).toEqual('PARAMS'); // infers it's a string
      expect(kibanaRequest.query).toStrictEqual({ search: 'query' });
      expect(kibanaRequest.query.search.toUpperCase()).toEqual('QUERY'); // infers it's a string
      expect(kibanaRequest.body).toEqual(body);
      expect(kibanaRequest.body.byteLength).toBeGreaterThan(0); // infers it's a buffer
    });

    it('should work with ValidationFunction', () => {
      const body = Buffer.from('body!');
      const request = {
        ...httpServerMock.createRawRequest({
          params: { id: 'params' },
          query: { search: 'query' },
        }),
        payload: body, // Set outside because the mock is using `merge` by lodash and breaks the Buffer into arrays
      } as any;
      const kibanaRequest = KibanaRequest.from(request, {
        params: schema.object({ id: schema.string() }),
        query: schema.object({ search: schema.string() }),
        body: (data, { ok, badRequest }) => {
          if (Buffer.isBuffer(data)) {
            return ok(data);
          } else {
            return badRequest('It should be a Buffer', []);
          }
        },
      });
      expect(kibanaRequest.params).toStrictEqual({ id: 'params' });
      expect(kibanaRequest.params.id.toUpperCase()).toEqual('PARAMS'); // infers it's a string
      expect(kibanaRequest.query).toStrictEqual({ search: 'query' });
      expect(kibanaRequest.query.search.toUpperCase()).toEqual('QUERY'); // infers it's a string
      expect(kibanaRequest.body).toEqual(body);
      expect(kibanaRequest.body.byteLength).toBeGreaterThan(0); // infers it's a buffer
    });
  });
});
