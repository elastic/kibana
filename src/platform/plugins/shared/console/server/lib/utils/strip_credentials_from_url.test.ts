/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stripCredentialsFromUrl } from './strip_credentials_from_url';

describe('stripCredentialsFromUrl', () => {
  it('strips username and password from URL', () => {
    expect(stripCredentialsFromUrl('https://user:secret@elasticsearch:9200')).toBe(
      'https://elasticsearch:9200/'
    );
  });

  it('strips username-only credentials', () => {
    expect(stripCredentialsFromUrl('https://user@elasticsearch:9200')).toBe(
      'https://elasticsearch:9200/'
    );
  });

  it('returns URL unchanged when no credentials are present', () => {
    expect(stripCredentialsFromUrl('https://elasticsearch:9200')).toBe(
      'https://elasticsearch:9200/'
    );
  });

  it('preserves path and query parameters', () => {
    expect(stripCredentialsFromUrl('https://user:pass@elasticsearch:9200/path?q=1')).toBe(
      'https://elasticsearch:9200/path?q=1'
    );
  });

  it('handles URL with encoded special characters in credentials', () => {
    expect(stripCredentialsFromUrl('https://user%40org:p%40ss@elasticsearch:9200')).toBe(
      'https://elasticsearch:9200/'
    );
  });

  it('returns invalid URL strings as-is', () => {
    expect(stripCredentialsFromUrl('not-a-url')).toBe('not-a-url');
  });

  it('handles http scheme', () => {
    expect(stripCredentialsFromUrl('http://kibana_system:SECRET@localhost:9200')).toBe(
      'http://localhost:9200/'
    );
  });
});
