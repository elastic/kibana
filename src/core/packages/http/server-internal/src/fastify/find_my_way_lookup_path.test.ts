/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FastifyRequest } from 'fastify';

import {
  getFindMyWayLookupPath,
  redirectLocationWithoutTrailingSlash,
  routeMatchHasEmptyNamedPathParam,
  stripTrailingSlashForFindMyWayLookup,
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

  it('detects empty named captures from find-my-way', () => {
    expect(routeMatchHasEmptyNamedPathParam({ alert_id: '' })).toBe(true);
    expect(routeMatchHasEmptyNamedPathParam({ alert_id: 'x' })).toBe(false);
    expect(routeMatchHasEmptyNamedPathParam({ path: '' }, 'path')).toBe(false);
  });
});
