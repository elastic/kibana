/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformSearchSourceOut } from './transform_search_source_out';

jest.mock('../../../../kibana_services', () => ({
  logger: { warn: jest.fn() },
}));

describe('transformSearchSourceOut', () => {
  const references = [
    {
      name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
      type: 'index-pattern',
      id: 'fizzle-1234',
    },
  ];

  it('returns filters and query for valid input', () => {
    const meta = {
      searchSourceJSON: JSON.stringify({
        filter: [
          { foo: 'bar', meta: { indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index' } },
        ],
        query: { query: 'test', language: 'kuery' },
      }),
    };
    const result = transformSearchSourceOut(meta, references);
    expect(result).toEqual({
      filters: [{ foo: 'bar', meta: { index: 'fizzle-1234' } }],
      query: { query: 'test', language: 'kuery' },
    });
  });

  it('returns empty object if searchSourceJSON is missing', () => {
    expect(transformSearchSourceOut({}, [])).toEqual({});
  });

  it('returns empty searchSource if parseSearchSourceJSON throws', () => {
    const meta = { searchSourceJSON: 'not json' };
    expect(transformSearchSourceOut(meta, [])).toEqual({});
  });

  it('falls back to parsedSearchSource if injectReferences throws', () => {
    const meta = {
      searchSourceJSON: JSON.stringify({
        filter: [{ foo: 'bar', meta: { indexRefName: 'does-not-exist' } }],
        query: { query: 'test', language: 'kuery' },
      }),
    };
    const result = transformSearchSourceOut(meta, []);
    expect(result).toEqual({
      filters: [{ foo: 'bar', meta: { indexRefName: 'does-not-exist' } }],
      query: { query: 'test', language: 'kuery' },
    });
  });
});
