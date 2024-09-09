/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getIndexPatternFromESQLQuery,
  getLimitFromESQLQuery,
  removeDropCommandsFromESQLQuery,
  hasTransformationalCommand,
  getTimeFieldFromESQLQuery,
  retieveMetadataColumns,
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

      const idxPattern14 = getIndexPatternFromESQLQuery('METRICS tsdb');
      expect(idxPattern14).toBe('tsdb');

      const idxPattern15 = getIndexPatternFromESQLQuery('METRICS tsdb max(cpu) BY host');
      expect(idxPattern15).toBe('tsdb');

      const idxPattern16 = getIndexPatternFromESQLQuery(
        'METRICS pods load=avg(cpu), writes=max(rate(indexing_requests)) BY pod | SORT pod'
      );
      expect(idxPattern16).toBe('pods');

      const idxPattern17 = getIndexPatternFromESQLQuery('FROM "$foo%"');
      expect(idxPattern17).toBe('$foo%');

      const idxPattern18 = getIndexPatternFromESQLQuery('FROM """foo-{{mm-dd_yy}}"""');
      expect(idxPattern18).toBe('foo-{{mm-dd_yy}}');
    });
  });

  describe('getLimitFromESQLQuery', () => {
    it('should return default limit when ES|QL query is empty', () => {
      const limit = getLimitFromESQLQuery('');
      expect(limit).toBe(1000);
    });

    it('should return default limit when ES|QL query does not contain LIMIT command', () => {
      const limit = getLimitFromESQLQuery('FROM foo');
      expect(limit).toBe(1000);
    });

    it('should return default limit when ES|QL query contains invalid LIMIT command', () => {
      const limit = getLimitFromESQLQuery('FROM foo | LIMIT iAmNotANumber');
      expect(limit).toBe(1000);
    });

    it('should return limit when ES|QL query contains LIMIT command', () => {
      const limit = getLimitFromESQLQuery('FROM foo | LIMIT 10000 | KEEP myField');
      expect(limit).toBe(10000);
    });

    it('should return minimum limit when ES|QL query contains multiple LIMIT command', () => {
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

  describe('hasTransformationalCommand', () => {
    it('should return false for non transformational command', () => {
      expect(hasTransformationalCommand('from a | eval b = 1')).toBeFalsy();
    });

    it('should return true for stats', () => {
      expect(hasTransformationalCommand('from a | stats count() as total by a=b')).toBeTruthy();
    });

    it('should return true for keep', () => {
      expect(hasTransformationalCommand('from a | keep field1, field2')).toBeTruthy();
    });

    it('should return false for commented out transformational command', () => {
      expect(
        hasTransformationalCommand(`from logstash-*
      // | stats  var0 = avg(bytes) by geo.dest`)
      ).toBeFalsy();
    });

    it('should return false for metrics with no aggregation', () => {
      expect(hasTransformationalCommand('metrics a')).toBeFalsy();
    });

    it('should return true for metrics with aggregations', () => {
      expect(hasTransformationalCommand('metrics a var = avg(b)')).toBeTruthy();
    });
  });

  describe('getTimeFieldFromESQLQuery', () => {
    it('should return undefined if there are no time params', () => {
      expect(getTimeFieldFromESQLQuery('from a | eval b = 1')).toBeUndefined();
    });

    it('should return the time field if there is at least one time param', () => {
      expect(getTimeFieldFromESQLQuery('from a | eval b = 1 | where time >= ?t_start')).toBe(
        'time'
      );
    });

    it('should return undefined if there is one named param but is not ?t_start or ?t_end', () => {
      expect(
        getTimeFieldFromESQLQuery('from a | eval b = 1 | where time >= ?late')
      ).toBeUndefined();
    });

    it('should return undefined if there is one named param but is used without a time field', () => {
      expect(
        getTimeFieldFromESQLQuery('from a | eval b = DATE_TRUNC(1 day, ?t_start)')
      ).toBeUndefined();
    });

    it('should return the time field if there is at least one time param in the bucket function', () => {
      expect(
        getTimeFieldFromESQLQuery(
          'from a | stats meow = avg(bytes) by bucket(event.timefield, 200, ?t_start, ?t_end)'
        )
      ).toBe('event.timefield');
    });
  });

  describe('retieveMetadataColumns', () => {
    it('should return metadata columns if they exist', () => {
      expect(retieveMetadataColumns('from a  metadata _id, _ignored | eval b = 1')).toStrictEqual([
        '_id',
        '_ignored',
      ]);
    });

    it('should return empty columns if metadata doesnt exist', () => {
      expect(retieveMetadataColumns('from a | eval b = 1')).toStrictEqual([]);
    });
  });
});
