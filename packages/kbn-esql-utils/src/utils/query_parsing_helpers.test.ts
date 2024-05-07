/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getIndexPatternFromESQLQuery,
  getLimitFromESQLQuery,
  removeDropCommandsFromESQLQuery,
} from './query_parsing_helpers';

describe('esql query helpers', () => {
  describe('getIndexPatternFromESQLQuery', () => {
    it('should return the index pattern string from esql queries', () => {
      const idxPattern1 = getIndexPatternFromESQLQuery('FROM foo');
      expect(idxPattern1).toBe('foo');

      const idxPattern3 = getIndexPatternFromESQLQuery('from foo | project abc, def');
      expect(idxPattern3).toBe('foo');

      const idxPattern4 = getIndexPatternFromESQLQuery('from foo | project a | limit 2');
      expect(idxPattern4).toBe('foo');

      const idxPattern5 = getIndexPatternFromESQLQuery('from foo | limit 2');
      expect(idxPattern5).toBe('foo');

      const idxPattern6 = getIndexPatternFromESQLQuery('from foo-1,foo-2 | limit 2');
      expect(idxPattern6).toBe('foo-1,foo-2');

      const idxPattern7 = getIndexPatternFromESQLQuery('from foo-1, foo-2 | limit 2');
      expect(idxPattern7).toBe('foo-1,foo-2');

      const idxPattern8 = getIndexPatternFromESQLQuery('FROM foo-1,  foo-2');
      expect(idxPattern8).toBe('foo-1,foo-2');

      const idxPattern9 = getIndexPatternFromESQLQuery('FROM foo-1, foo-2 [metadata _id]');
      expect(idxPattern9).toBe('foo-1,foo-2');

      const idxPattern10 = getIndexPatternFromESQLQuery('FROM foo-1, remote_cluster:foo-2, foo-3');
      expect(idxPattern10).toBe('foo-1,remote_cluster:foo-2,foo-3');

      const idxPattern11 = getIndexPatternFromESQLQuery(
        'FROM foo-1, foo-2 | where event.reason like "*Disable: changed from [true] to [false]*"'
      );
      expect(idxPattern11).toBe('foo-1,foo-2');

      const idxPattern12 = getIndexPatternFromESQLQuery('FROM foo-1, foo-2 // from command used');
      expect(idxPattern12).toBe('foo-1,foo-2');

      const idxPattern13 = getIndexPatternFromESQLQuery('ROW a = 1, b = "two", c = null');
      expect(idxPattern13).toBe('');
    });
  });

  describe('getLimitFromESQLQuery', () => {
    it('should return default limit when ES|QL query is empty', () => {
      const limit = getLimitFromESQLQuery('');
      expect(limit).toBe(500);
    });

    it('should return default limit when ES|QL query does not contain LIMIT command', () => {
      const limit = getLimitFromESQLQuery('FROM foo');
      expect(limit).toBe(500);
    });

    it('should return default limit when ES|QL query contains invalid LIMIT command', () => {
      const limit = getLimitFromESQLQuery('FROM foo | LIMIT iAmNotANumber');
      expect(limit).toBe(500);
    });

    it('should return limit when ES|QL query contains LIMIT command', () => {
      const limit = getLimitFromESQLQuery('FROM foo | LIMIT 10000 | KEEP myField');
      expect(limit).toBe(10000);
    });

    it('should return last limit when ES|QL query contains multiple LIMIT command', () => {
      const limit = getLimitFromESQLQuery('FROM foo | LIMIT 200 | LIMIT 0');
      expect(limit).toBe(0);
    });
  });

  describe('removeDropCommandsFromESQLQuery', () => {
    it('should not remove anything if a drop command is not present', () => {
      expect(removeDropCommandsFromESQLQuery('from a | eval b = 1')).toBe('from a | eval b = 1');
    });

    it('should remove multiple drop statement if present', () => {
      expect(
        removeDropCommandsFromESQLQuery(
          'from a | drop @timestamp | drop a | drop b | keep c | drop d'
        )
      ).toBe('from a | keep c ');
    });
  });
});
