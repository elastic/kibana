/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { Filter } from '@kbn/es-query';
import { toEvidenceSelection, toStoredFilters } from './hunt_evidence';

const record = (raw: Record<string, unknown>, flattened: Record<string, unknown>) =>
  ({ id: 'x', raw, flattened } as unknown as DataTableRecord);

describe('toEvidenceSelection', () => {
  it('references an event by the index and id from its ES|QL columns', () => {
    expect(
      toEvidenceSelection(
        record({}, { _index: 'logs-a', _id: 'e1', 'host.name': 'h' }),
        'raw_event'
      )
    ).toEqual({ kind: 'raw_event', index: 'logs-a', id: 'e1' });
  });

  it('falls back to the raw hit of a data view row', () => {
    expect(toEvidenceSelection(record({ _index: 'logs-b', _id: 'e2' }, {}), 'raw_event')).toEqual({
      kind: 'raw_event',
      index: 'logs-b',
      id: 'e2',
    });
  });

  it('cannot select an event that has no index or no id', () => {
    expect(toEvidenceSelection(record({}, { _index: 'logs-a' }), 'raw_event')).toBeUndefined();
    expect(toEvidenceSelection(record({}, { _id: 'e1' }), 'raw_event')).toBeUndefined();
    expect(toEvidenceSelection(record({}, { _index: '', _id: 'e1' }), 'raw_event')).toBeUndefined();
  });

  it('sends an aggregate row as scalar values, truncating long ones', () => {
    const selection = toEvidenceSelection(
      record({}, { a: 1, b: 'x'.repeat(5000), c: null, d: undefined, e: ['p', 'q'], f: true }),
      'aggregate'
    );

    expect(selection).toEqual({
      kind: 'aggregate',
      values: { a: 1, b: 'x'.repeat(1024), c: null, d: null, e: '["p","q"]', f: true },
    });
  });
});

describe('toStoredFilters', () => {
  it('keeps a small filter as JSON so it can be restored', () => {
    const filter = { meta: { key: 'a' }, query: { match: { a: 1 } } } as unknown as Filter;

    expect(toStoredFilters([filter])).toEqual([{ json: JSON.stringify(filter) }]);
  });

  it('summarizes a filter too large to keep whole', () => {
    const filter = {
      meta: { key: 'host.name', type: 'phrases', negate: true, disabled: false },
      query: { terms: { 'host.name': Array.from({ length: 200 }, (_, i) => `host-${i}`) } },
    } as unknown as Filter;

    expect(toStoredFilters([filter])).toEqual([
      { key: 'host.name', type: 'phrases', negate: true, disabled: false },
    ]);
  });
});
