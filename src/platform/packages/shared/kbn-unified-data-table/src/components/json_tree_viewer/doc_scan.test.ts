/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDocumentText, collectSearchMatches } from './doc_scan';
import { buildNodes, ROOT_ID } from './tree_model';

describe('getDocumentText', () => {
  it('joins the keys and primitive values of a nested object with newlines', () => {
    const text = getDocumentText({ name: 'Berlin', geo: { country: 'DE', population: 3500000 } });
    expect(text).toBe('name\nBerlin\ngeo\ncountry\nDE\npopulation\n3500000');
  });

  it('walks arrays, emitting the key once and then every item', () => {
    const text = getDocumentText({ tags: ['error', 'warn'] });
    expect(text).toBe('tags\nerror\nwarn');
  });

  it('renders null and undefined values as "null"', () => {
    const text = getDocumentText({ a: null, b: undefined });
    expect(text).toBe('a\nnull\nb\nnull');
  });

  it('returns a bare string for a primitive document', () => {
    expect(getDocumentText('hello')).toBe('hello');
    expect(getDocumentText(42)).toBe('42');
  });

  it('returns an empty string for an undefined document', () => {
    expect(getDocumentText(undefined)).toBe('');
  });

  it('separates adjacent fields so a search term cannot span two of them', () => {
    const text = getDocumentText({ a: 'foo', b: 'bar' });
    expect(text).toBe('a\nfoo\nb\nbar');
    expect(text).not.toContain('foobar');
  });
});

describe('collectSearchMatches', () => {
  it('returns the ids of every collection whose subtree contains the term', () => {
    const nodes = buildNodes({ geo: { city: 'Berlin' }, other: 'x' });
    expect([...collectSearchMatches(nodes, 'berl').containers]).toEqual(['json-viewer-geo']);
  });

  it('returns an empty set when nothing matches', () => {
    const nodes = buildNodes({ geo: { city: 'Berlin' } });
    expect(collectSearchMatches(nodes, 'zzz').containers.size).toBe(0);
  });

  it('reveals past the pager budget when a match sits deeper than INITIAL_CHILDREN', () => {
    const nodes = buildNodes({
      logs: Object.fromEntries(
        Array.from({ length: 15 }, (_, i) => [`field_${i}`, i === 12 ? 'needle' : `other_${i}`])
      ),
    });
    const matches = collectSearchMatches(nodes, 'needle');

    expect([...matches.containers]).toEqual(['json-viewer-logs']);
    expect(matches.reveals.get('json-viewer-logs')).toBe(13);
    expect(matches.reveals.has(ROOT_ID)).toBe(false);
  });
});
