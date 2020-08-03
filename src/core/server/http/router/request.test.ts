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

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
}));

import { RouteOptions } from 'hapi';
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
            auth,
          },
        },
      });
      const kibanaRequest = KibanaRequest.from(request);

      expect(kibanaRequest.route.options.authRequired).toBe(false);
    });
    it('handles required auth: { mode: "required" }', () => {
      const auth: RouteOptions['auth'] = { mode: 'required' };
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

    it('handles required auth: { mode: "optional" }', () => {
      const auth: RouteOptions['auth'] = { mode: 'optional' };
      const request = httpServerMock.createRawRequest({
        route: {
          settings: {
            auth,
          },
        },
      });
      const kibanaRequest = KibanaRequest.from(request);

      expect(kibanaRequest.route.options.authRequired).toBe('optional');
    });

    it('handles required auth: { mode: "try" } as "optional"', () => {
      const auth: RouteOptions['auth'] = { mode: 'try' };
      const request = httpServerMock.createRawRequest({
        route: {
          settings: {
            auth,
          },
        },
      });
      const kibanaRequest = KibanaRequest.from(request);

      expect(kibanaRequest.route.options.authRequired).toBe('optional');
    });

    it('throws on auth: strategy name', () => {
      const auth: RouteOptions['auth'] = 'session';
      const request = httpServerMock.createRawRequest({
        route: {
          settings: {
            auth,
          },
        },
      });

      expect(() => KibanaRequest.from(request)).toThrowErrorMatchingInlineSnapshot(
        `"unexpected authentication options: \\"session\\" for route: /"`
      );
    });

    it('throws on auth: { mode: unexpected mode }', () => {
      const auth: RouteOptions['auth'] = { mode: undefined };
      const request = httpServerMock.createRawRequest({
        route: {
          settings: {
            auth,
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
