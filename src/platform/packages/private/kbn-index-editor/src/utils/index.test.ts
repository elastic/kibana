/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getArrayBackedColumns } from '.';

describe('getArrayBackedColumns', () => {
  it('flags columns whose ancestor is an array of objects', () => {
    const source = {
      a: [
        { b: 1, c: 2 },
        { b: 3, c: 4 },
      ],
    };

    expect(getArrayBackedColumns(['a.b', 'a.c'], [source])).toEqual(['a.b', 'a.c']);
  });

  it('does not flag fields inside a single object', () => {
    const source = { user: { name: 'Ada', age: 36 } };

    expect(getArrayBackedColumns(['user.name', 'user.age'], [source])).toEqual([]);
  });

  it('does not flag a top-level scalar array, which is safe to replace wholesale', () => {
    const source = { tags: ['a', 'b'] };

    expect(getArrayBackedColumns(['tags'], [source])).toEqual([]);
  });

  it('does not flag a scalar array nested in a single object', () => {
    const source = { a: { tags: ['x', 'y'] } };

    expect(getArrayBackedColumns(['a.tags'], [source])).toEqual([]);
  });

  it('flags deeply nested fields under an array ancestor', () => {
    const source = { a: { b: [{ c: 1 }, { c: 2 }] } };

    expect(getArrayBackedColumns(['a.b.c'], [source])).toEqual(['a.b.c']);
  });

  it('flags a column when any document has an array ancestor', () => {
    const scalarDoc = { a: { b: 1 } };
    const arrayDoc = { a: [{ b: 1 }, { b: 2 }] };

    expect(getArrayBackedColumns(['a.b'], [scalarDoc, arrayDoc])).toEqual(['a.b']);
  });

  it('ignores documents that do not contain the field', () => {
    const source = { other: 1 };

    expect(getArrayBackedColumns(['a.b'], [source])).toEqual([]);
  });

  it('ignores non-object sources', () => {
    expect(getArrayBackedColumns(['a.b'], [undefined, null, 'string', 42])).toEqual([]);
  });
});
