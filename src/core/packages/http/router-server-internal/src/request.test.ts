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

import { v4 as uuidv4 } from 'uuid';
import type { RouteOptions } from '@hapi/hapi';
import { hapiMocks } from '@kbn/hapi-mocks';
import type { FakeRawRequest, RouteSecurity, RouteSecurityGetter } from '@kbn/core-http-server';
import { CoreKibanaRequest } from './request';
import { schema } from '@kbn/config-schema';
import {
  ELASTIC_HTTP_VERSION_HEADER,
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

    describe('lifecycle snapshots', () => {
      it('reuses request initialization between fresh facades in the same phase', () => {
        const uuidMock = jest.mocked(uuidv4);
        uuidMock.mockClear();
        const request = hapiMocks.createRequest({
          headers: { custom: 'one' },
        });

        const first = CoreKibanaRequest.fromForLifecycle(request, 'preAuth');
        const second = CoreKibanaRequest.fromForLifecycle(request, 'preAuth');

        expect(uuidMock).toHaveBeenCalledTimes(2);
        expect(second).not.toBe(first);
        expect(second.headers).toBe(first.headers);
        expect(second.route).toBe(first.route);
        expect(second.socket).toBe(first.socket);
        expect(second.events).toBe(first.events);
        expect(second.serverTiming).toBe(first.serverTiming);
        expect(second.params).not.toBe(first.params);
        expect(second.query).not.toBe(first.query);
        expect(second.body).not.toBe(first.body);
        expect(second.auth).not.toBe(first.auth);
        expect(Object.isFrozen(second.headers)).toBe(true);
        expect(Object.isFrozen(second.route)).toBe(true);

        (first as CoreKibanaRequest & { customField?: number }).customField = 42;
        expect(
          (second as CoreKibanaRequest & { customField?: number }).customField
        ).toBeUndefined();
      });

      it('observes header changes while carrying stable routed metadata forward', () => {
        const request = hapiMocks.createRequest({
          headers: { authorization: 'Bearer before-auth' },
        });
        const preAuth = CoreKibanaRequest.fromForLifecycle(request, 'preAuth');

        request.headers.authorization = 'Bearer after-auth';
        const postAuth = CoreKibanaRequest.fromForLifecycle(request, 'postAuth');

        expect(postAuth.headers.authorization).toBe('Bearer after-auth');
        expect(postAuth.headers).not.toBe(preAuth.headers);
        expect(postAuth.route).toBe(preAuth.route);
        expect(postAuth.url).toBe(preAuth.url);
        expect(postAuth.socket).toBe(preAuth.socket);
        expect(postAuth.events).toBe(preAuth.events);
        expect(postAuth.serverTiming).toBe(preAuth.serverTiming);
      });

      it('keeps facade auth and authorization state fresh while reusing snapshots', () => {
        const request = hapiMocks.createRequest();
        const first = CoreKibanaRequest.fromForLifecycle(request, 'postAuth');

        request.auth.isAuthenticated = false;
        Object.assign(request.app, { authzResult: { feature: true } });
        const second = CoreKibanaRequest.fromForLifecycle(request, 'postAuth');

        expect(second.headers).toBe(first.headers);
        expect(second.route).toBe(first.route);
        expect(second.auth.isAuthenticated).toBe(false);
        expect(second.authzResult).toEqual({ feature: true });
      });

      it('rebuilds snapshots after invalidation', () => {
        const request = hapiMocks.createRequest({
          headers: { custom: 'before-rewrite' },
        });
        const initial = CoreKibanaRequest.fromForLifecycle(request, 'preRouting');

        request.headers.custom = 'after-rewrite';
        expect(CoreKibanaRequest.fromForLifecycle(request, 'preRouting').headers.custom).toBe(
          'before-rewrite'
        );

        CoreKibanaRequest.invalidateLifecycleSnapshot(request, 'preRouting');
        const refreshed = CoreKibanaRequest.fromForLifecycle(request, 'preRouting');

        expect(refreshed.headers.custom).toBe('after-rewrite');
        expect(refreshed.headers).not.toBe(initial.headers);
        expect(refreshed.route).not.toBe(initial.route);
        expect(refreshed.socket).toBe(initial.socket);
        expect(refreshed.events).toBe(initial.events);
        expect(refreshed.serverTiming).toBe(initial.serverTiming);
      });

      it('does not reuse lifecycle snapshots for validated requests', () => {
        const request = hapiMocks.createRequest({
          params: { id: 'request-id' },
        });
        const lifecycleRequest = CoreKibanaRequest.fromForLifecycle(request, 'postAuth');

        const validatedRequest = CoreKibanaRequest.from(request, {
          params: schema.object({ id: schema.string() }),
        });

        expect(lifecycleRequest.params).toEqual({});
        expect(validatedRequest.params).toEqual({ id: 'request-id' });
        expect(validatedRequest.headers).not.toBe(lifecycleRequest.headers);
        expect(validatedRequest.route).not.toBe(lifecycleRequest.route);
        expect(validatedRequest.socket).not.toBe(lifecycleRequest.socket);
        expect(validatedRequest.events).not.toBe(lifecycleRequest.events);
        expect(validatedRequest.serverTiming).not.toBe(lifecycleRequest.serverTiming);
      });

      it('reuses request initialization for authentication and validated handlers', () => {
        const uuidMock = jest.mocked(uuidv4);
        uuidMock.mockClear();
        const request = hapiMocks.createRequest({
          headers: { authorization: 'Bearer before-auth' },
          params: { id: 'request-id' },
        });

        const preAuth = CoreKibanaRequest.fromForLifecycle(request, 'preAuth');
        const auth = CoreKibanaRequest.fromForAuth(request);

        request.headers.authorization = 'Bearer after-auth';
        request.auth.isAuthenticated = true;
        const postAuth = CoreKibanaRequest.fromForLifecycle(request, 'postAuth');
        const handler = CoreKibanaRequest.fromForHandler(request, {
          params: schema.object({ id: schema.string() }),
        });

        expect(uuidMock).toHaveBeenCalledTimes(2);
        expect(auth).not.toBe(preAuth);
        expect(handler).not.toBe(postAuth);
        expect(auth.headers).not.toBe(preAuth.headers);
        expect(postAuth.headers.authorization).toBe('Bearer after-auth');
        expect(handler.params).toEqual({ id: 'request-id' });
        expect(handler.auth.isAuthenticated).toBe(true);
        expect(auth.route).toBe(preAuth.route);
        expect(postAuth.route).not.toBe(auth.route);
        expect(handler.route).toBe(postAuth.route);
        expect(handler.socket).toBe(preAuth.socket);
        expect(handler.events).toBe(preAuth.events);
        expect(handler.serverTiming).toBe(preAuth.serverTiming);
      });

      it('refreshes request-derived route security after authentication', () => {
        const beforeAuthSecurity: RouteSecurity = {
          authz: { requiredPrivileges: ['before-auth'] },
        };
        const afterAuthSecurity: RouteSecurity = {
          authz: { requiredPrivileges: ['after-auth'] },
        };
        const getSecurity: RouteSecurityGetter = (request) =>
          request?.headers[ELASTIC_HTTP_VERSION_HEADER] === 'after-auth'
            ? afterAuthSecurity
            : beforeAuthSecurity;
        const request = hapiMocks.createRequest({
          headers: { [ELASTIC_HTTP_VERSION_HEADER]: 'before-auth' },
          route: { settings: { app: { security: getSecurity } } },
        });

        CoreKibanaRequest.fromForLifecycle(request, 'preAuth');
        const auth = CoreKibanaRequest.fromForAuth(request);
        request.headers[ELASTIC_HTTP_VERSION_HEADER] = 'after-auth';
        const postAuth = CoreKibanaRequest.fromForLifecycle(request, 'postAuth');

        expect(auth.route.options.security).toBe(beforeAuthSecurity);
        expect(postAuth.route.options.security).toBe(afterAuthSecurity);
        expect(postAuth.route).not.toBe(auth.route);
        expect(postAuth.url).toBe(auth.url);
      });

      it('validates fresh request parts for every handler facade', () => {
        const request = hapiMocks.createRequest({
          params: { id: 'first-id' },
        });
        const routeSchemas = {
          params: schema.object({ id: schema.string() }),
        };

        const first = CoreKibanaRequest.fromForHandler(request, routeSchemas);
        request.params.id = 'second-id';
        const second = CoreKibanaRequest.fromForHandler(request, routeSchemas);

        expect(first.params).toEqual({ id: 'first-id' });
        expect(second.params).toEqual({ id: 'second-id' });
        expect(second).not.toBe(first);
        expect(second.route).toBe(first.route);
        expect(second.headers).toBe(first.headers);
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

    describe('route.options.httpResponseLogLevel property', () => {
      it.each`
        value        | expected
        ${'info'}    | ${'info'}
        ${undefined} | ${undefined}
      `('handles httpResponseLogLevel: $value', ({ value, expected }) => {
        const request = hapiMocks.createRequest({
          route: {
            settings: {
              app: {
                httpResponseLogLevel: value,
              },
            },
          },
        });
        const kibanaRequest = CoreKibanaRequest.from(request);

        expect(kibanaRequest.route.options.httpResponseLogLevel).toBe(expected);
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
        };
        const kibanaRequest = CoreKibanaRequest.from(request);
        expect(kibanaRequest.isFakeRequest).toBe(true);
      });
    });

    describe('httpVersion', () => {
      it('should be 1.0', () => {
        const request: FakeRawRequest = {
          headers: {},
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
