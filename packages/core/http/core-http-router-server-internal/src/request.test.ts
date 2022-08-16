/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
}));

import type { FastifyReply } from 'fastify';
import { fastifyMocks } from '@kbn/hapi-mocks';
import { CoreKibanaRequest } from './request';
import { schema } from '@kbn/config-schema';

const reply = {} as FastifyReply;

describe('CoreKibanaRequest', () => {
  describe('id property', () => {
    it('uses the request.context.config.requestId property if present', () => {
      const request = fastifyMocks.createRequest({
        context: { config: { requestId: 'fakeId' } },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);
      expect(kibanaRequest.id).toEqual('fakeId');
    });

    it('generates a new UUID if request.context.config.requestId property is not present', () => {
      // Undefined context.config.requestId property
      const request = fastifyMocks.createRequest({
        context: { config: {} },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);
      expect(kibanaRequest.id).toEqual('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    });
  });

  describe('uuid property', () => {
    it('uses the request.id property if present', () => {
      const request = fastifyMocks.createRequest({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);
      expect(kibanaRequest.uuid).toEqual('123e4567-e89b-12d3-a456-426614174000');
    });

    it('generates a new UUID if request.id property is not present', () => {
      // Undefined id property
      const request = fastifyMocks.createRequest({
        id: undefined,
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);
      expect(kibanaRequest.uuid).toEqual('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    });
  });

  describe('get all headers', () => {
    it('returns all headers', () => {
      const request = fastifyMocks.createRequest({
        headers: { custom: 'one', authorization: 'token' },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);
      expect(kibanaRequest.headers).toEqual({ custom: 'one', authorization: 'token' });
    });
  });

  describe('headers property', () => {
    it('provides a frozen copy of request headers', () => {
      const rawRequestHeaders = { custom: 'one' };
      const request = fastifyMocks.createRequest({
        headers: rawRequestHeaders,
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);

      expect(kibanaRequest.headers).toEqual({ custom: 'one' });
      expect(kibanaRequest.headers).not.toBe(rawRequestHeaders);
      expect(Object.isFrozen(kibanaRequest.headers)).toBe(true);
    });

    it.skip("doesn't expose authorization header by default", () => {
      const request = fastifyMocks.createRequest({
        headers: { custom: 'one', authorization: 'token' },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);
      expect(kibanaRequest.headers).toEqual({
        custom: 'one',
      });
    });

    it('exposes authorization header if secured = false', () => {
      const request = fastifyMocks.createRequest({
        headers: { custom: 'one', authorization: 'token' },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply, undefined, false);
      expect(kibanaRequest.headers).toEqual({
        custom: 'one',
        authorization: 'token',
      });
    });
  });

  describe('isSytemApi property', () => {
    it('is false when no kbn-system-request header is set', () => {
      const request = fastifyMocks.createRequest({
        headers: { custom: 'one' },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);
      expect(kibanaRequest.isSystemRequest).toBe(false);
    });

    it('is true when kbn-system-request header is set to true', () => {
      const request = fastifyMocks.createRequest({
        headers: { custom: 'one', 'kbn-system-request': 'true' },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);
      expect(kibanaRequest.isSystemRequest).toBe(true);
    });

    it('is false when kbn-system-request header is set to false', () => {
      const request = fastifyMocks.createRequest({
        headers: { custom: 'one', 'kbn-system-request': 'false' },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);
      expect(kibanaRequest.isSystemRequest).toBe(false);
    });
  });

  describe('route.options.authRequired property', () => {
    it('handles required auth: undefined', () => {
      const request = fastifyMocks.createRequest({
        context: {
          config: {
            auth: undefined,
          },
        },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);

      expect(kibanaRequest.route.options.authRequired).toBe(true);
    });
    it('handles required auth: false', () => {
      const request = fastifyMocks.createRequest({
        context: {
          config: {
            auth: false,
          },
        },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);

      expect(kibanaRequest.route.options.authRequired).toBe(false);
    });
    it('handles required auth: { mode: "required" }', () => {
      const request = fastifyMocks.createRequest({
        context: {
          config: {
            auth: { mode: 'required' },
          },
        },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);

      expect(kibanaRequest.route.options.authRequired).toBe(true);
    });

    it('handles required auth: { mode: "optional" }', () => {
      const request = fastifyMocks.createRequest({
        context: {
          config: {
            auth: { mode: 'optional' },
          },
        },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);

      expect(kibanaRequest.route.options.authRequired).toBe('optional');
    });

    it('handles required auth: { mode: "try" } as "optional"', () => {
      const request = fastifyMocks.createRequest({
        context: {
          config: {
            auth: { mode: 'try' },
          },
        },
      });
      const kibanaRequest = CoreKibanaRequest.from(request, reply);

      expect(kibanaRequest.route.options.authRequired).toBe('optional');
    });

    it('throws on auth: strategy name', () => {
      const request = fastifyMocks.createRequest({
        context: {
          config: {
            auth: { strategies: ['session'] },
          },
        },
      });

      expect(() => CoreKibanaRequest.from(request, reply)).toThrowErrorMatchingInlineSnapshot(
        `"unexpected authentication options: {\\"strategies\\":[\\"session\\"]} for route: /"`
      );
    });

    it('throws on auth: { mode: unexpected mode }', () => {
      const request = fastifyMocks.createRequest({
        context: {
          config: {
            auth: { mode: undefined },
          },
        },
      });

      expect(() => CoreKibanaRequest.from(request, reply)).toThrowErrorMatchingInlineSnapshot(
        `"unexpected authentication options: {} for route: /"`
      );
    });
  });

  describe('RouteSchema type inferring', () => {
    it('should work with config-schema', () => {
      const body = Buffer.from('body!');
      const request = {
        ...fastifyMocks.createRequest({
          params: { id: 'params' },
          query: { search: 'query' },
        }),
        payload: body, // Set outside because the mock is using `merge` by lodash and breaks the Buffer into arrays
      } as any;
      const kibanaRequest = CoreKibanaRequest.from(
        request,
        {
          params: schema.object({ id: schema.string() }),
          query: schema.object({ search: schema.string() }),
          body: schema.buffer(),
        },
        reply
      );
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
        ...fastifyMocks.createRequest({
          params: { id: 'params' },
          query: { search: 'query' },
        }),
        payload: body, // Set outside because the mock is using `merge` by lodash and breaks the Buffer into arrays
      } as any;
      const kibanaRequest = CoreKibanaRequest.from(
        request,
        {
          params: schema.object({ id: schema.string() }),
          query: schema.object({ search: schema.string() }),
          body: (data, { ok, badRequest }) => {
            if (Buffer.isBuffer(data)) {
              return ok(data);
            } else {
              return badRequest('It should be a Buffer', []);
            }
          },
        },
        reply
      );
      expect(kibanaRequest.params).toStrictEqual({ id: 'params' });
      expect(kibanaRequest.params.id.toUpperCase()).toEqual('PARAMS'); // infers it's a string
      expect(kibanaRequest.query).toStrictEqual({ search: 'query' });
      expect(kibanaRequest.query.search.toUpperCase()).toEqual('QUERY'); // infers it's a string
      expect(kibanaRequest.body).toEqual(body);
      expect(kibanaRequest.body.byteLength).toBeGreaterThan(0); // infers it's a buffer
    });
  });
});
