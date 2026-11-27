/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SearchState } from './query';
import { refineSearch } from './query';

function search(language: SearchState['language'], query: string): SearchState {
  return { index: 'logs-*', language, query };
}

describe('refineSearch', () => {
  describe('kql', () => {
    it('uses the clause alone when the parent query is empty', () => {
      expect(
        refineSearch(search('kql', '  '), { kind: 'equals', field: 'host.name', value: 'web-1' })
      ).toEqual(search('kql', 'host.name: "web-1"'));
    });

    it('ands the clause with the parent query', () => {
      expect(
        refineSearch(search('kql', 'a: 1 or b: 2'), { kind: 'equals', field: 'status', value: 500 })
          .query
      ).toBe('(a: 1 or b: 2) and status: 500');
    });

    it('escapes quotes and backslashes in values and special characters in field names', () => {
      expect(
        refineSearch(search('kql', ''), {
          kind: 'equals',
          field: 'my field',
          value: 'say "hi" \\o/',
        }).query
      ).toBe('my\\ field: "say \\"hi\\" \\\\o/"');
    });

    it('builds half-open ranges and open-ended ranges', () => {
      expect(
        refineSearch(search('kql', ''), { kind: 'range', field: 'bytes', gte: 10, lt: 20 }).query
      ).toBe('bytes >= 10 and bytes < 20');
      expect(
        refineSearch(search('kql', ''), { kind: 'range', field: 'bytes', gte: 10 }).query
      ).toBe('bytes >= 10');
    });

    it('matches documents without the field', () => {
      expect(refineSearch(search('kql', ''), { kind: 'missing', field: 'user.id' }).query).toBe(
        'not user.id: *'
      );
    });
  });

  describe('lucene', () => {
    it('ands the clause with the parent query and escapes field names', () => {
      expect(
        refineSearch(search('lucene', 'status:500'), {
          kind: 'equals',
          field: 'url:path',
          value: '/a',
        }).query
      ).toBe('(status:500) AND url\\:path:"/a"');
    });

    it('builds an inclusive-exclusive range', () => {
      expect(
        refineSearch(search('lucene', ''), {
          kind: 'range',
          field: '@timestamp',
          gte: '2026-01-01T00:00:00.000Z',
          lt: '2026-01-02T00:00:00.000Z',
        }).query
      ).toBe('@timestamp:["2026-01-01T00:00:00.000Z" TO "2026-01-02T00:00:00.000Z"}');
    });
  });

  describe('dsl', () => {
    it('uses term for keyword fields and match_phrase for text fields', () => {
      expect(
        JSON.parse(
          refineSearch(search('dsl', ''), {
            kind: 'equals',
            field: 'tag',
            fieldType: 'keyword',
            value: 'x',
          }).query
        )
      ).toEqual({ term: { tag: 'x' } });
      expect(
        JSON.parse(
          refineSearch(search('dsl', ''), {
            kind: 'equals',
            field: 'message',
            fieldType: 'text',
            value: 'x y',
          }).query
        )
      ).toEqual({ match_phrase: { message: 'x y' } });
    });

    it('wraps the parent query and the clause in a bool filter', () => {
      expect(
        JSON.parse(
          refineSearch(search('dsl', '{"match_all":{}}'), { kind: 'missing', field: 'f' }).query
        )
      ).toEqual({
        bool: { filter: [{ match_all: {} }, { bool: { must_not: { exists: { field: 'f' } } } }] },
      });
    });
  });
});
