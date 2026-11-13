/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asCodeFilterSchema } from '@kbn/as-code-filters-schema';
import { fromStoredFilter } from './from_stored_filter';
import { toStoredFilter } from './to_stored_filter';
import type { StoredFilter } from './types';

const getStoredFilter = (meta: Partial<StoredFilter['meta']> = {}): StoredFilter => ({
  meta: {
    index: 'esql-dataset-id',
    type: 'phrase',
    key: 'size_class',
    params: { query: 'large' },
    negate: false,
    disabled: false,
    esql: { type: 'string', esType: 'keyword' },
    ...meta,
  },
  query: { match_phrase: { size_class: 'large' } },
});

describe('ES|QL filters', () => {
  it('keeps the ES|QL column types when converting to the as code format', () => {
    const asCode = fromStoredFilter(getStoredFilter());

    expect(asCode).toEqual(
      expect.objectContaining({ esql: { type: 'string', es_type: 'keyword' } })
    );
    expect(asCodeFilterSchema.safeParse(asCode).success).toBe(true);
  });

  it('keeps the ES|QL column types when converting back to a stored filter', () => {
    const stored = toStoredFilter(fromStoredFilter(getStoredFilter())!);

    expect(stored?.meta.esql).toEqual({ type: 'string', esType: 'keyword' });
  });

  it('keeps the marker for exists and several values filters', () => {
    const exists = getStoredFilter({ type: 'exists', params: undefined });
    exists.query = { exists: { field: 'size_class' } };
    const phrases = getStoredFilter({ type: 'phrases', params: ['large', 'small'] });
    phrases.query = {
      bool: {
        should: [
          { match_phrase: { size_class: 'large' } },
          { match_phrase: { size_class: 'small' } },
        ],
        minimum_should_match: 1,
      },
    };

    [exists, phrases].forEach((filter) => {
      expect(toStoredFilter(fromStoredFilter(filter)!)?.meta.esql).toEqual({
        type: 'string',
        esType: 'keyword',
      });
    });
  });

  it('does not add the marker to other filters', () => {
    const { esql, ...meta } = getStoredFilter().meta;
    const asCode = fromStoredFilter({ ...getStoredFilter(), meta });

    expect(asCode).not.toHaveProperty('esql');
    expect(toStoredFilter(asCode!)?.meta).not.toHaveProperty('esql');
  });
});
