/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildContentListSearch, buildContentListUrlRegex } from './content_list';

describe('buildContentListSearch', () => {
  it('returns an empty string when no params are provided', () => {
    expect(buildContentListSearch({})).toBe('');
  });

  it('serializes a free-text query', () => {
    expect(buildContentListSearch({ q: 'Alpha' })).toBe('?q=Alpha');
  });

  it('keeps `:` in the sort param unencoded to mirror the provider URL shape', () => {
    expect(buildContentListSearch({ sort: 'title:desc' })).toBe('?sort=title:desc');
  });

  it('serializes both `q` and `sort` in a stable order', () => {
    expect(buildContentListSearch({ q: 'Alpha', sort: 'title:desc' })).toBe(
      '?q=Alpha&sort=title:desc'
    );
  });

  it('preserves an explicitly empty `q` value', () => {
    expect(buildContentListSearch({ q: '' })).toBe('?q=');
  });

  it('encodes spaces in `q` as `%20`', () => {
    expect(buildContentListSearch({ q: 'hello world' })).toBe('?q=hello%20world');
  });

  it('keeps RFC 3986 sub-delims in `q` readable', () => {
    // The Content List provider preserves these characters; the regex must too.
    expect(buildContentListSearch({ q: 'foo,bar(baz)!' })).toBe('?q=foo,bar(baz)!');
  });
});

describe('buildContentListUrlRegex', () => {
  it('matches the bare hash route when no params are provided', () => {
    const regex = buildContentListUrlRegex('#/home', {});
    expect('http://localhost:5601/app/graph#/home').toMatch(regex);
    expect('http://localhost:5601/app/graph#/home?q=Alpha').not.toMatch(regex);
  });

  it('matches a hash route with a `q` param', () => {
    const regex = buildContentListUrlRegex('#/home', { q: 'Alpha' });
    expect('http://localhost:5601/app/graph#/home?q=Alpha').toMatch(regex);
  });

  it('matches a hash route with both `q` and `sort` params', () => {
    const regex = buildContentListUrlRegex('#/home', { q: 'Alpha', sort: 'title:desc' });
    expect('http://localhost:5601/app/graph#/home?q=Alpha&sort=title:desc').toMatch(regex);
    expect('http://localhost:5601/app/graph#/home?q=Alpha').not.toMatch(regex);
  });

  it('escapes regex metacharacters in the hash route', () => {
    const regex = buildContentListUrlRegex('#/list.view', {});
    expect('http://localhost:5601/app/foo#/list.view').toMatch(regex);
    expect('http://localhost:5601/app/foo#/listXview').not.toMatch(regex);
  });
});
