/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractReferences } from './extract_references';
import { DATA_VIEW_SAVED_OBJECT_TYPE, SerializedSearchSourceFields } from '../..';
import { FilterMeta } from '@kbn/es-query';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('extractReferences', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('extracts reference from index', () => {
    const state = { index: 'test-index-id', query: { query: '', language: 'kuery' } };
    const result = extractReferences(state);
    const fields: SerializedSearchSourceFields & { indexRefName?: string } = result[0];
    const references = result[1];

    expect(fields.index).toBeUndefined();
    expect(fields.indexRefName).toBe('data-view-mock-uuid');
    expect(references).toEqual([
      {
        name: 'data-view-mock-uuid',
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: 'test-index-id',
      },
    ]);
  });

  it('extracts references from filters', () => {
    const state = {
      filter: [{ meta: { index: 'filter-index-id' } }, { meta: {} }, {}],
    };
    const [fields, references] = extractReferences(state as any);
    const filterMeta: FilterMeta & { indexRefName?: string } = fields.filter?.[0].meta!;

    expect(filterMeta.index).toBeUndefined();
    expect(filterMeta.indexRefName).toBe('filter-data-view-mock-uuid');
    expect(references).toEqual([
      {
        name: 'filter-data-view-mock-uuid',
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        id: 'filter-index-id',
      },
    ]);
  });

  it('returns original state and empty references if no index or filter', () => {
    const state = { query: { query: '', language: 'kuery' } };
    const [fields, references] = extractReferences(state as any);

    expect(fields).toEqual(state);
    expect(references).toEqual([]);
  });
});
