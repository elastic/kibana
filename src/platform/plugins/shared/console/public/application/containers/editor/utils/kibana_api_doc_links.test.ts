/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getKibanaApiDocLink, getKibanaApiOperationId } from './kibana_api_doc_links';

describe('getKibanaApiOperationId', () => {
  const docLinks = {
    '/api/spaces/space/{id}': {
      get: 'get-spaces-space-id',
      put: 'put-spaces-space-id',
      delete: 'delete-spaces-space-id',
    },
    '/api/spaces/space': {
      get: 'get-spaces-space',
      post: 'post-spaces-space',
    },
    '/api/features': {
      get: 'get-features',
    },
  };

  it('matches a literal path', () => {
    expect(getKibanaApiOperationId('GET', 'kbn:/api/features', docLinks)).toBe('get-features');
  });

  it('matches a path with a concrete parameter value', () => {
    expect(getKibanaApiOperationId('GET', 'kbn:/api/spaces/space/default', docLinks)).toBe(
      'get-spaces-space-id'
    );
  });

  it('is case-insensitive for the method', () => {
    expect(getKibanaApiOperationId('get', 'kbn:/api/spaces/space/default', docLinks)).toBe(
      'get-spaces-space-id'
    );
  });

  it('prefers the more specific (literal) template when both match segment count', () => {
    // "/api/spaces/space" (0 params) should win over any 1-segment-longer template;
    // here we assert the literal-only collection path resolves to its own operation,
    // not to a param-based template with the same segment count.
    expect(getKibanaApiOperationId('POST', 'kbn:/api/spaces/space', docLinks)).toBe(
      'post-spaces-space'
    );
  });

  it('strips query strings before matching', () => {
    expect(getKibanaApiOperationId('GET', 'kbn:/api/spaces/space/default?foo=bar', docLinks)).toBe(
      'get-spaces-space-id'
    );
  });

  it('returns null when no template matches the path', () => {
    expect(getKibanaApiOperationId('GET', 'kbn:/api/does/not/exist', docLinks)).toBe(null);
  });

  it('returns null when the method does not match', () => {
    expect(getKibanaApiOperationId('DELETE', 'kbn:/api/features', docLinks)).toBe(null);
  });

  it('handles urls without a kbn: prefix', () => {
    expect(getKibanaApiOperationId('GET', '/api/features', docLinks)).toBe('get-features');
  });
});

describe('getKibanaApiDocLink', () => {
  const docLinks = {
    '/api/features': { get: 'get-features' },
  };
  const base = 'https://www.elastic.co/docs/api/doc/kibana/';

  it('builds the operation deep link when a template matches', () => {
    expect(getKibanaApiDocLink('GET', 'kbn:/api/features', docLinks, base)).toBe(
      'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-features'
    );
  });

  it('returns null when no template matches', () => {
    expect(getKibanaApiDocLink('GET', 'kbn:/api/unknown', docLinks, base)).toBe(null);
  });
});
