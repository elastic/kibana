/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAllowedEsPath } from './es_path_access';

describe('WHEN checking whether an Elasticsearch path may be proxied', () => {
  it.each([
    '/_count',
    '/my-index',
    '/my-index/_cache/clear',
    '/my-index/_close',
    '/my-index/_count',
    '/my-index/_doc/1',
    '/my-index/_doc/a%2Fb',
    '/.kibana/_doc/_underscore-id',
    '/my-index/_flush',
    '/my-index/_forcemerge',
    '/my-index/_mapping',
    '/my-index/_open',
    '/my-index/_refresh',
    '/my-index/_settings',
    '/my-index/_stats',
    '/my-index/_stats/docs%2Cstore',
    '/*/_stats/docs%2Cstore',
    '/.kibana/_settings',
    '/index-a%2Cindex-b/_mapping',
    '/index-a,index-b/_mapping',
  ])('SHOULD allow %s', (path) => {
    expect(isAllowedEsPath(path)).toBe(true);
  });

  it.each([
    '/_security/_authenticate',
    '/_security/user/elastic',
    '/_SECURITY/user',
    '/%5Fsecurity/user',
    '/_security_something',
    '/_encryption/key',
    '/_ssl/certificates',
  ])('SHOULD block %s', (path) => {
    expect(isAllowedEsPath(path)).toBe(false);
  });

  it.each([
    ['the root', '/'],
    ['a document API without an id', '/my-index/_doc'],
    ['a nested document path', '/my-index/_doc/1/extra'],
    ['an empty document id', '/my-index/_doc/'],
    ['a search API', '/my-index/_search'],
    ['a cluster API', '/_cluster/settings'],
    ['an API in the index position', '/_cat/indices'],
    ['_all in the index position', '/_all/_close'],
    ['an API within an index list', '/my-index%2C_security/_settings'],
    ['an empty name within an index list', '/my-index%2C/_settings'],
    ['a trailing slash', '/my-index/_settings/'],
    ['an unknown sub-path', '/my-index/_cache/other'],
    ['an empty metric', '/my-index/_stats/'],
    ['malformed percent-encoding', '/my-index%E0%A4%A/_settings'],
  ])('SHOULD reject %s', (_name, path) => {
    expect(isAllowedEsPath(path)).toBe(false);
  });
});
