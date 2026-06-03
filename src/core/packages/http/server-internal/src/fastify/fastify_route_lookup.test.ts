/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import FindMyWay from 'find-my-way';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { KibanaRouteOptions, RouterRoute } from '@kbn/core-http-server';
import { getFindMyWayLookupPath } from './find_my_way_lookup_path';
import { populateMatchedRouteFromFindMyWay } from './fastify_route_lookup';

describe('populateMatchedRouteFromFindMyWay', () => {
  const kibanaRouteOptions: KibanaRouteOptions = {
    xsrfRequired: true,
    access: 'internal',
    security: {
      authz: { enabled: false, reason: 'test' },
      authc: { enabled: false, reason: 'test' },
    },
  };
  const kibanaRoute = {
    method: 'get',
    path: '/api/demo',
    options: { tags: [] },
    security: kibanaRouteOptions.security,
  } as unknown as RouterRoute;

  const fmw = FindMyWay({ caseSensitive: true, ignoreTrailingSlash: false });
  fmw.on('GET', '/api/demo', () => undefined, { kibanaRoute, kibanaRouteOptions });

  const lookupOptions = {
    fmw,
    getLookupPath: getFindMyWayLookupPath,
    staticDirectoryRouteInfo: new Map<string, string>(),
    staticDirectoryRouteOptions: kibanaRouteOptions,
    pathnameMatchesWildcardPattern: () => false,
    defaultSocketTimeoutMs: 30_000,
  };

  const makeReq = (rawUrl: string): FastifyRequest =>
    ({
      method: 'GET',
      raw: {
        url: rawUrl,
        socket: {
          setTimeout: jest.fn(),
          once: jest.fn(),
          removeListener: jest.fn(),
          destroyed: false,
          destroy: jest.fn(),
        },
      },
      url: rawUrl,
      headers: { host: 'localhost' },
    } as unknown as FastifyRequest);

  const makeReply = (): FastifyReply =>
    ({
      raw: { once: jest.fn() },
    } as unknown as FastifyReply);

  it('does not match before onPreRouting rewrite (space-prefixed path)', () => {
    const req = makeReq('/s/default/api/demo');
    populateMatchedRouteFromFindMyWay(req, makeReply(), lookupOptions);
    expect((req as any).app?.matchedKibanaRouteOptions).toBeUndefined();
  });

  it('does not apply static-directory options when a Kibana route matched without options', () => {
    const staticOptions: KibanaRouteOptions = {
      xsrfRequired: false,
      access: 'public',
      security: {
        authc: { enabled: false, reason: 'static' },
        authz: { enabled: false, reason: 'static' },
      },
    };
    const appRoute = {
      method: 'get',
      path: '/app/{id}/{any*}',
      options: { tags: [] },
      security: {
        authc: { enabled: true },
        authz: { enabled: false, reason: 'app' },
      },
    } as unknown as RouterRoute;

    const appFmw = FindMyWay({ caseSensitive: true, ignoreTrailingSlash: false });
    appFmw.on('GET', '/app/:id/*', () => undefined, { kibanaRoute: appRoute });
    appFmw.on('GET', '/app/:id', () => undefined, { kibanaRoute: appRoute });

    const req = makeReq('/app/kibana_overview');
    populateMatchedRouteFromFindMyWay(req, makeReply(), {
      ...lookupOptions,
      fmw: appFmw,
      staticDirectoryRouteInfo: new Map([['/assets/*', 'path']]),
      staticDirectoryRouteOptions: staticOptions,
      pathnameMatchesWildcardPattern: (pathname, pattern) =>
        pathname === '/assets/foo' && pattern === '/assets/*',
    });

    expect((req as any).app?.matchedRoute).toBe(appRoute);
    expect((req as any).app?.matchedKibanaRouteOptions?.security).toEqual(appRoute.security);
  });

  it('does not stash the alerts route for a trailing-slash path when a catch-all exists', () => {
    const alertsFmw = FindMyWay({ caseSensitive: true, ignoreTrailingSlash: false });
    const alertsRoute = {
      method: 'get',
      path: '/api/cases/alerts/{alert_id}',
      options: { tags: [] },
      security: kibanaRouteOptions.security,
    } as unknown as RouterRoute;
    const catchAllRoute = {
      method: 'get',
      path: '/{path*}',
      options: { tags: [] },
      security: kibanaRouteOptions.security,
    } as unknown as RouterRoute;
    alertsFmw.on('GET', '/api/cases/:case_id', () => undefined, {
      kibanaRoute: {
        method: 'get',
        path: '/api/cases/{case_id}',
        options: { tags: [] },
        security: kibanaRouteOptions.security,
      },
      kibanaRouteOptions,
    });
    alertsFmw.on('GET', '/api/cases/alerts/:alert_id', () => undefined, {
      kibanaRoute: alertsRoute,
      kibanaRouteOptions,
    });
    alertsFmw.on('GET', '/*', () => undefined, {
      kibanaRoute: catchAllRoute,
      kibanaRouteOptions,
      wildcardName: 'path',
    });

    const req = makeReq('/api/cases/alerts/');
    populateMatchedRouteFromFindMyWay(req, makeReply(), {
      ...lookupOptions,
      fmw: alertsFmw,
      globalCatchAll: {
        handler: () => undefined,
        store: {
          kibanaRoute: catchAllRoute,
          kibanaRouteOptions,
          wildcardName: 'path',
        },
        wildcardName: 'path',
      },
    });

    expect((req as any).app?.matchedRoute).toBe(catchAllRoute);
    expect((req as any).app?.matchedRouteParams?.path).toBe('api/cases/alerts/');
  });

  it('matches after rewrite and exposes security on KibanaRequest', () => {
    const req = makeReq('/api/demo');
    const reply = makeReply();
    populateMatchedRouteFromFindMyWay(req, reply, lookupOptions);

    expect((req as any).app?.matchedKibanaRouteOptions).toEqual(kibanaRouteOptions);
    const security = (req as any).app?.matchedKibanaRouteOptions?.security;
    expect(
      security && typeof security === 'object' && 'authz' in security && security.authz
    ).toEqual(
      kibanaRouteOptions.security &&
        typeof kibanaRouteOptions.security === 'object' &&
        'authz' in kibanaRouteOptions.security &&
        kibanaRouteOptions.security.authz
    );
  });
});
