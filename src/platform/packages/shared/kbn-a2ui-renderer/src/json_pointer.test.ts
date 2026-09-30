/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPointer, parsePointer, setPointer, UnsafePointerError } from './json_pointer';

describe('parsePointer', () => {
  it('treats the empty pointer and "/" as the document root', () => {
    expect(parsePointer('')).toEqual([]);
    expect(parsePointer('/')).toEqual([]);
  });

  it('decodes the ~0 and ~1 escapes', () => {
    expect(parsePointer('/a~1b/c~0d')).toEqual(['a/b', 'c~d']);
  });

  it.each(['__proto__', 'constructor', 'prototype'])('rejects the %s segment', (segment) => {
    expect(() => parsePointer(`/form/${segment}/x`)).toThrow(UnsafePointerError);
  });
});

describe('getPointer', () => {
  const doc = { form: { name: 'ada', tags: ['x', 'y'] }, count: 2 };

  it('reads nested object and array values', () => {
    expect(getPointer(doc, '/form/name')).toBe('ada');
    expect(getPointer(doc, '/form/tags/1')).toBe('y');
    expect(getPointer(doc, '')).toBe(doc);
  });

  it('returns undefined for missing paths instead of throwing', () => {
    expect(getPointer(doc, '/form/missing/deep')).toBeUndefined();
    expect(getPointer(doc, '/count/nope')).toBeUndefined();
    expect(getPointer(doc, '/form/tags/notanindex')).toBeUndefined();
  });
});

describe('setPointer', () => {
  it('does not mutate the input', () => {
    const doc = { form: { name: 'ada' } };
    const next = setPointer(doc, '/form/name', 'grace');
    expect(doc.form.name).toBe('ada');
    expect(getPointer(next, '/form/name')).toBe('grace');
  });

  it('creates intermediate containers, choosing arrays for numeric segments', () => {
    const next = setPointer({}, '/a/0/b', 'v');
    expect(next).toEqual({ a: [{ b: 'v' }] });
  });

  it('appends to an array with the "-" segment', () => {
    const next = setPointer({ list: ['a'] }, '/list/-', 'b');
    expect(getPointer(next, '/list')).toEqual(['a', 'b']);
  });

  it('deletes the key when the value is null', () => {
    const next = setPointer({ a: 1, b: 2 }, '/a', null);
    expect(next).toEqual({ b: 2 });
  });

  it('replaces the whole document for the root pointer', () => {
    expect(setPointer({ a: 1 }, '', { b: 2 })).toEqual({ b: 2 });
  });

  it('shares untouched subtrees so unrelated subscribers can skip re-render', () => {
    const doc = { kept: { deep: true }, changed: { v: 1 } };
    const next = setPointer(doc, '/changed/v', 2) as typeof doc;
    expect(next.kept).toBe(doc.kept);
    expect(next.changed).not.toBe(doc.changed);
  });
});
