/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAsCodeListSort } from './list_sort';

describe('getAsCodeListSort', () => {
  it('lists newest first when sort and query are omitted', () => {
    expect(getAsCodeListSort({})).toEqual({
      sortField: 'updated_at',
      sortOrder: 'desc',
    });
  });

  it('keeps relevance order when a text query is present and sort is omitted', () => {
    expect(getAsCodeListSort({ query: 'sales' })).toEqual({});
  });

  it('maps a descending meta field onto the saved object root field', () => {
    expect(getAsCodeListSort({ sort: '-meta.updated_at', query: 'sales' })).toEqual({
      sortField: 'updated_at',
      sortOrder: 'desc',
    });
  });

  it('maps an ascending created_at field', () => {
    expect(getAsCodeListSort({ sort: 'meta.created_at' })).toEqual({
      sortField: 'created_at',
      sortOrder: 'asc',
    });
  });

  it('rejects a field the query schema does not allow', () => {
    expect(() => getAsCodeListSort({ sort: 'title' })).toThrow(/meta\.updated_at/);
  });
});
