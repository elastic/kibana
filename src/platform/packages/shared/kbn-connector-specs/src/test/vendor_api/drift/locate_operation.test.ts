/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { locateOperation, serverUrls } from './locate_operation';

const moved = {
  servers: [{ url: 'https://{region}.sentry.io/api/0' }],
  paths: { '/organizations/{org}/issues/{id}/': { get: {}, put: {} } },
};

describe('locateOperation', () => {
  it('finds an operation where it was', () => {
    expect(locateOperation(moved, '/organizations/{org}/issues/{id}/', 'GET')).toEqual({
      status: 'present',
    });
  });

  it('finds an operation whose path prefix moved into the server URL', () => {
    expect(locateOperation(moved, '/api/0/organizations/{org}/issues/{id}/', 'put')).toEqual({
      status: 'moved',
      path: '/organizations/{org}/issues/{id}/',
      serverPath: '/api/0',
    });
  });

  it("reports a moved path whose method isn't there as missing", () => {
    expect(locateOperation(moved, '/api/0/organizations/{org}/issues/{id}/', 'delete')).toEqual({
      status: 'missing',
    });
  });

  it('finds a path without a method, and paths in x-ms-paths', () => {
    expect(locateOperation(moved, '/api/0/organizations/{org}/issues/{id}/')).toMatchObject({
      status: 'moved',
    });
    expect(
      locateOperation(
        { 'x-ms-paths': { '/{container}?restype=container': { get: {} } } },
        '/{container}?restype=container',
        'get'
      )
    ).toEqual({ status: 'present' });
  });

  it("doesn't take a server without a path, or a path that only shares a prefix, as a move", () => {
    const document = { servers: [{ url: 'https://api.example.com' }], paths: { '/items': {} } };
    expect(locateOperation(document, '/v1/items')).toEqual({ status: 'missing' });
    expect(
      locateOperation({ servers: [{ url: '/api' }], paths: { '/items': {} } }, '/apiv2/items')
    ).toEqual({ status: 'missing' });
  });
});

describe('serverUrls', () => {
  it('lists the server URLs, ignoring malformed entries', () => {
    expect(serverUrls({ servers: [{ url: 'https://a' }, {}, 'b'] })).toEqual(['https://a']);
    expect(serverUrls({})).toEqual([]);
  });
});
