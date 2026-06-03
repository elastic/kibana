/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FastifyRequest } from 'fastify';

import FindMyWay from 'find-my-way';

import {
  findMyWayRouteMatch,
  getFindMyWayLookupPath,
  redirectLocationWithoutTrailingSlash,
  restoreTrailingSlashInWildcardParam,
  routeMatchHasEmptyNamedPathParam,
  stripTrailingSlashForFindMyWayLookup,
  type GlobalCatchAllRoute,
} from './find_my_way_lookup_path';

function makeReq(url: string): FastifyRequest {
  return { raw: { url }, url } as unknown as FastifyRequest;
}

describe('find_my_way_lookup_path', () => {
  it('strips trailing slashes for lookup except root', () => {
    expect(stripTrailingSlashForFindMyWayLookup('/api/cases/alerts/')).toBe('/api/cases/alerts');
    expect(stripTrailingSlashForFindMyWayLookup('/api/cases/alerts')).toBe('/api/cases/alerts');
    expect(stripTrailingSlashForFindMyWayLookup('/')).toBe('/');
  });

  it('builds redirect locations that preserve query strings', () => {
    const req = makeReq('/api/cases/alerts/?owner=foo');
    const lookupPath = getFindMyWayLookupPath(req);
    expect(redirectLocationWithoutTrailingSlash(req, lookupPath)).toBe(
      '/api/cases/alerts?owner=foo'
    );
  });

  it('restores trailing slash on wildcard params after slashless lookup', () => {
    const req = makeReq('/some-path/');
    const params: Record<string, string | undefined> = { path: 'some-path' };
    restoreTrailingSlashInWildcardParam(req, params, 'path');
    expect(params.path).toBe('some-path/');
  });

  it('detects empty named captures from find-my-way', () => {
    expect(routeMatchHasEmptyNamedPathParam({ alert_id: '' })).toBe(true);
    expect(routeMatchHasEmptyNamedPathParam({ alert_id: 'x' })).toBe(false);
    expect(routeMatchHasEmptyNamedPathParam({ path: '' }, 'path')).toBe(false);
  });

  it('rejects empty named capture on trailing-slash URL then matches catch-all via slashless path', () => {
    const fmw = FindMyWay({ caseSensitive: true, ignoreTrailingSlash: false });
    fmw.on('GET', '/api/cases/:case_id', () => 'case', {});
    fmw.on('GET', '/api/cases/alerts/:alert_id', () => 'alerts', {});
    fmw.on('GET', '/*', () => 'wildcard', { wildcardName: 'path' });

    const req = makeReq('/api/cases/alerts/');
    const match = findMyWayRouteMatch(fmw, 'GET', req, {
      handler: (() => 'wildcard') as GlobalCatchAllRoute['handler'],
      wildcardName: 'path',
    });

    expect((match?.handler as () => string)()).toBe('wildcard');
    expect(match?.params).toEqual({ '*': 'api/cases/alerts' });
  });

  it('prefers trailing-slash pathname for routes registered only with a slash', () => {
    const fmw = FindMyWay({ caseSensitive: true, ignoreTrailingSlash: false });
    fmw.on('GET', '/only/trailing/', () => 'slashRoute', {});

    const req = makeReq('/only/trailing/');
    const match = findMyWayRouteMatch(fmw, 'GET', req);

    expect((match?.handler as () => string)()).toBe('slashRoute');
  });
});
