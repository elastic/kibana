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
import { populateMatchedRouteFromFindMyWay } from './fastify_route_lookup';

function lookupPath(req: FastifyRequest): string {
  const raw = req.raw.url ?? req.url;
  if (typeof raw !== 'string' || raw === '') {
    return '/';
  }
  const pathOnly = raw.split(/[?#]/, 1)[0];
  if (pathOnly === '') {
    return '/';
  }
  return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
}

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
    getLookupPath: lookupPath,
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
