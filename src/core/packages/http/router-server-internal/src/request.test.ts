/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
}));

import { RouteOptions } from '@hapi/hapi';
import { hapiMocks } from '@kbn/hapi-mocks';
import type { FakeRawRequest, RouteSecurity } from '@kbn/core-http-server';
import { CoreKibanaRequest } from './request';
import { schema } from '@kbn/config-schema';
import {
  ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';

describe('CoreKibanaRequest', () => {
  describe('using real requests', () => {
    describe('id property', () => {
      it('uses the request.app.requestId property if present', () => {
        const request = hapiMocks.createRequest({
          app: { requestId: 'fakeId' },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.id).toEqual('fakeId');
      });

      it('generates a new UUID if request.app property is not present', () => {
        // Undefined app property
        const request = hapiMocks.createRequest({
          app: undefined,
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.id).toEqual('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      });

      it('generates a new UUID if request.app.requestId property is not present', () => {
        // Undefined app.requestId property
        const request = hapiMocks.createRequest({
          app: {},
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.id).toEqual('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      });
    });

    describe('uuid property', () => {
      it('uses the request.app.requestUuid property if present', () => {
        const request = hapiMocks.createRequest({
          app: { requestUuid: '123e4567-e89b-12d3-a456-426614174000' },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.uuid).toEqual('123e4567-e89b-12d3-a456-426614174000');
      });

      it('generates a new UUID if request.app property is not present', () => {
        // Undefined app property
        const request = hapiMocks.createRequest({
          app: undefined,
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.uuid).toEqual('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      });

      it('generates a new UUID if request.app.requestUuid property is not present', () => {
        // Undefined app.requestUuid property
        const request = hapiMocks.createRequest({
          app: {},
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.uuid).toEqual('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      });
    });

    describe('get all headers', () => {
      it('returns all headers', () => {
        const request = hapiMocks.createRequest({
          headers: { custom: 'one', authorization: 'token' },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.headers).toEqual({ custom: 'one', authorization: 'token' });
      });
    });

    describe('headers property', () => {
      it('provides a frozen copy of request headers', () => {
        const rawRequestHeaders = { custom: 'one' };
        const request = hapiMocks.createRequest({
          headers: rawRequestHeaders,
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.headers).toEqual({ custom: 'one' });
        expect(kibanaRequest.headers).not.toBe(rawRequestHeaders);
        expect(Object.isFrozen(kibanaRequest.headers)).toBe(true);
      });

      it.skip("doesn't expose authorization header by default", () => {
        const request = hapiMocks.createRequest({
          headers: { custom: 'one', authorization: 'token' },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.headers).toEqual({
          custom: 'one',
        });
      });

      it('exposes authorization header if secured = false', () => {
        const request = hapiMocks.createRequest({
          headers: { custom: 'one', authorization: 'token' },
        });
        const kibanaRequest = CoreKibanaRequest.from(request, undefined, false);
        expect(kibanaRequest.headers).toEqual({
          custom: 'one',
          authorization: 'token',
        });
      });
    });

    describe('isSystemRequest property', () => {
      it('is false when no kbn-system-request header is set', () => {
        const request = hapiMocks.createRequest({
          headers: { custom: 'one' },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.isSystemRequest).toBe(false);
      });

      it('is true when kbn-system-request header is set to true', () => {
        const request = hapiMocks.createRequest({
          headers: { custom: 'one', 'kbn-system-request': 'true' },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.isSystemRequest).toBe(true);
      });

      it('is false when kbn-system-request header is set to false', () => {
        const request = hapiMocks.createRequest({
          headers: { custom: 'one', 'kbn-system-request': 'false' },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.isSystemRequest).toBe(false);
      });
    });

    describe('isInternalApiRequest property', () => {
      it('is true when header is set', () => {
        const request = hapiMocks.createRequest({
          headers: { [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'true' },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.isInternalApiRequest).toBe(true);
      });
      it('is true when query param is set', () => {
        const request = hapiMocks.createRequest({
          query: { [ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM]: 'true' },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.isInternalApiRequest).toBe(true);
      });
      it('is true when both header and query param is set', () => {
        const request = hapiMocks.createRequest({
          headers: { [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'true' },
          query: { [ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM]: 'true' },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.isInternalApiRequest).toBe(true);
      });
      it('is false when neither header nor query param is set', () => {
        const request = hapiMocks.createRequest();
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.isInternalApiRequest).toBe(false);
      });
    });

    describe('sanitize input', () => {
      it('does not pass the reserved query parameter to consumers', () => {
        const request = hapiMocks.createRequest({
          query: { [ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM]: 'true', myCoolValue: 'cool!' },
        });
        const kibanaRequest = CoreKibanaRequest.from(request, {
          query: schema.object({ myCoolValue: schema.string() }),
        });
        expect(kibanaRequest.query).toEqual({ myCoolValue: 'cool!' });
      });
      it('pass nothing if only the reserved query param is present', () => {
        const request = hapiMocks.createRequest({
          query: { [ELASTIC_INTERNAL_ORIGIN_QUERY_PARAM]: 'true' },
        });
        expect(() =>
          CoreKibanaRequest.from(request, {
            query: schema.object({}, { unknowns: 'forbid' }), // we require an empty object
          })
        ).not.toThrow();
      });
    });

    describe('route.httpVersion property', () => {
      it('returns the version from the raw request', () => {
        const request = hapiMocks.createRequest({
          raw: {
            req: {
              httpVersion: '7.4',
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.httpVersion).toEqual('7.4');
      });
    });

    describe('route.protocol property', () => {
      it('return the correct value for http/1.0 requests', () => {
        const request = hapiMocks.createRequest({
          raw: {
            req: {
              httpVersion: '1.0',
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.protocol).toEqual('http1');
      });
      it('return the correct value for http/1.1 requests', () => {
        const request = hapiMocks.createRequest({
          raw: {
            req: {
              httpVersion: '1.1',
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.protocol).toEqual('http1');
      });
      it('return the correct value for http/2 requests', () => {
        const request = hapiMocks.createRequest({
          raw: {
            req: {
              httpVersion: '2.0',
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.protocol).toEqual('http2');
      });
    });

    describe('route.options.authRequired property', () => {
      it('handles required auth: undefined', () => {
        const auth: RouteOptions['auth'] = undefined;
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              auth,
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.authRequired).toBe(true);
      });
      it('handles required auth: false', () => {
        const auth: RouteOptions['auth'] = false;
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              // @ts-expect-error According to types/hapi__hapi, `auth` can't be a boolean, but it can according to the @hapi/hapi source (https://github.com/hapijs/hapi/blob/v18.4.2/lib/route.js#L139)
              auth,
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.authRequired).toBe(false);
      });
      it('handles required auth: { mode: "required" }', () => {
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              auth: { mode: 'required' },
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.authRequired).toBe(true);
      });

      it('handles required auth: { mode: "optional" }', () => {
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              auth: { mode: 'optional' },
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.authRequired).toBe('optional');
      });

      it('handles required auth: { mode: "try" } as "optional"', () => {
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              auth: { mode: 'try' },
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.authRequired).toBe('optional');
      });

      it('throws on auth: strategy name', () => {
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              auth: { strategies: ['session'] },
            },
          },
        });

        expect(() => CoreKibanaRequest.from(request)).toThrowErrorMatchingInlineSnapshot(
          `"unexpected authentication options: {\\"strategies\\":[\\"session\\"]} for route: /"`
        );
      });

      it('throws on auth: { mode: unexpected mode }', () => {
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              auth: { mode: undefined },
            },
          },
        });

        expect(() => CoreKibanaRequest.from(request)).toThrowErrorMatchingInlineSnapshot(
          `"unexpected authentication options: {} for route: /"`
        );
      });
    });

    describe('route.options.security property', () => {
      it('handles required authc: undefined', () => {
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              app: {
                security: { authc: undefined },
              },
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.authRequired).toBe(true);
      });

      it('handles required authc: { enabled: undefined }', () => {
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              app: {
                security: { authc: { enabled: undefined } },
              },
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.authRequired).toBe(true);
      });

      it('handles required authc: { enabled: true }', () => {
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              app: {
                security: { authc: { enabled: true } },
              },
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.authRequired).toBe(true);
      });

      it('handles required authz simple config', () => {
        const security: RouteSecurity = {
          authz: {
            requiredPrivileges: ['privilege1'],
          },
        };
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              app: {
                security,
              },
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.security).toEqual(security);
      });

      it('handles required authz complex config', () => {
        const security: RouteSecurity = {
          authz: {
            requiredPrivileges: [
              {
                allRequired: ['privilege1'],
                anyRequired: ['privilege2', 'privilege3'],
              },
            ],
          },
        };
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              app: {
                security,
              },
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.security).toEqual(security);
      });

      it('handles required authz config for the route with RouteSecurityGetter', () => {
        const security: RouteSecurity = {
          authz: {
            requiredPrivileges: [
              {
                allRequired: ['privilege1'],
                anyRequired: ['privilege2', 'privilege3'],
              },
            ],
          },
        };
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              app: {
                // security is a getter function only for the versioned routes
                security: () => security,
              },
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.security).toEqual(security);
      });
    });

    describe('route.options.excludeFromRateLimiter property', () => {
      it.each`
        value        | expected
        ${true}      | ${true}
        ${false}     | ${false}
        ${undefined} | ${undefined}
      `('handles excludeFromRateLimiter: ${value}', ({ value, expected }) => {
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              app: {
                excludeFromRateLimiter: value,
              },
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.excludeFromRateLimiter).toBe(expected);
      });
    });

    describe('RouteSchema type inferring', () => {
      it('should work with config-schema', () => {
        const body = Buffer.from('body!');
        const request = {
          ...hapiMocks.createRequest({
            params: { id: 'params' },
            query: { search: 'query' },
          }),
          payload: body, // Set outside because the mock is using `merge` by lodash and breaks the Buffer into arrays
        } as any;
        const kibanaRequest = CoreKibanaRequest.from(request, {
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
          ...hapiMocks.createRequest({
            params: { id: 'params' },
            query: { search: 'query' },
          }),
          payload: body, // Set outside because the mock is using `merge` by lodash and breaks the Buffer into arrays
        } as any;
        const kibanaRequest = CoreKibanaRequest.from(request, {
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

    describe('isFakeRequest', () => {
      it('should be false', () => {
        const request = hapiMocks.createRequest({});
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.isFakeRequest).toBe(false);
      });
    });
  });

  describe('using fake requests', () => {
    describe('isFakeRequest', () => {
      it('should be true', () => {
        const request: FakeRawRequest = {
          headers: {},
          path: '/',
        };
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.isFakeRequest).toBe(true);
      });
    });

    describe('httpVersion', () => {
      it('should be 1.0', () => {
        const request: FakeRawRequest = {
          headers: {},
          path: '/',
        };
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.httpVersion).toEqual('1.0');
      });
    });

    describe('headers', () => {
      it('returns the correct headers', () => {
        const request: FakeRawRequest = {
          headers: {
            foo: 'bar',
            hello: 'dolly',
          },
          path: '/',
        };
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.headers).toEqual({
          foo: 'bar',
          hello: 'dolly',
        });
      });
    });

    describe('auth', () => {
      it('returns the correct value for isAuthenticated', () => {
        expect(
          CoreKibanaRequest.from({
            headers: {},
            path: '/',
            auth: { isAuthenticated: true },
          }).auth.isAuthenticated
        ).toEqual(true);
        expect(
          CoreKibanaRequest.from({
            headers: {},
            path: '/',
            auth: { isAuthenticated: false },
          }).auth.isAuthenticated
        ).toEqual(false);
      });
    });
  });
});
