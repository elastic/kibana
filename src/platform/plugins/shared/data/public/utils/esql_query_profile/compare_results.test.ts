/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compareResults, summarizeResults } from './compare_results';

const response = (names: string[], values: unknown[][]) =>
  summarizeResults({ columns: names.map((name) => ({ name })), values });

describe('summarizeResults', () => {
  it('returns nothing for a response without columns and values', () => {
    expect(summarizeResults({})).toBeUndefined();
    expect(summarizeResults({ columns: [] })).toBeUndefined();
  });
});

describe('compareResults', () => {
  const rows = [
    ['a', 1],
    ['b', 2],
    ['c', 3],
  ];

  it('says nothing when either run has no results', () => {
    expect(compareResults(undefined, response(['k', 'v'], rows))).toBeUndefined();
    expect(compareResults(response(['k', 'v'], rows), undefined)).toBeUndefined();
  });

  it('reports identical results in the same order', () => {
    expect(compareResults(response(['k', 'v'], rows), response(['k', 'v'], rows))).toEqual({
      kind: 'same',
      rowCount: 3,
      sameOrder: true,
    });
  });

  it('reports the same rows in a different order', () => {
    const shuffled = [rows[2], rows[0], rows[1]];

    expect(compareResults(response(['k', 'v'], rows), response(['k', 'v'], shuffled))).toEqual({
      kind: 'same',
      rowCount: 3,
      sameOrder: false,
    });
  });

  it('ignores floating point noise from a different summing order', () => {
    const verdict = compareResults(response(['avg'], [[0.1 + 0.2]]), response(['avg'], [[0.3]]));

    expect(verdict).toMatchObject({ kind: 'same' });
  });

  it('tells a column apart by its type, since the same values in another type are another result', () => {
    const asLong = summarizeResults({ columns: [{ name: 'n', type: 'long' }], values: [[1]] });
    const asDouble = summarizeResults({ columns: [{ name: 'n', type: 'double' }], values: [[1]] });

    expect(compareResults(asLong, asDouble)).toEqual({ kind: 'differentColumns' });
    expect(compareResults(asLong, asLong)).toMatchObject({ kind: 'same' });
  });

  it('tells large integers apart, such as timestamps that differ in the last digits', () => {
    const verdict = compareResults(
      response(['t'], [[1_700_000_000_123]]),
      response(['t'], [[1_700_000_000_999]])
    );

    expect(verdict).toEqual({ kind: 'differentRows', rowCount: 1 });
  });

  it('reports different columns, row counts and rows', () => {
    const baseline = response(['k', 'v'], rows);

    expect(compareResults(baseline, response(['k', 'total'], rows))).toEqual({
      kind: 'differentColumns',
    });
    expect(compareResults(baseline, response(['k', 'v'], rows.slice(0, 2)))).toEqual({
      kind: 'differentRowCount',
      baseline: 3,
      current: 2,
    });
    expect(compareResults(baseline, response(['k', 'v'], [rows[0], rows[1], ['c', 4]]))).toEqual({
      kind: 'differentRows',
      rowCount: 3,
    });
  });

  it('tells multi-valued and null cells apart', () => {
    const baseline = response(['t'], [[['a', 'b']], [null]]);

    expect(compareResults(baseline, response(['t'], [[['a', 'b']], [null]]))).toMatchObject({
      kind: 'same',
    });
    expect(compareResults(baseline, response(['t'], [[['a']], [null]]))).toEqual({
      kind: 'differentRows',
      rowCount: 2,
    });
  });
});
