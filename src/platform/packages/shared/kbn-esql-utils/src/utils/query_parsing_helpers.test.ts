/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import {
  getIndexPatternFromESQLQuery,
  getLimitFromESQLQuery,
  removeDropCommandsFromESQLQuery,
  hasTransformationalCommand,
  getTimeFieldFromESQLQuery,
  isQueryWrappedByPipes,
  retrieveMetadataColumns,
  getQueryColumnsFromESQLQuery,
  mapVariableToColumn,
  getValuesFromQueryField,
  fixESQLQueryWithVariables,
  getCategorizeColumns,
  getArgsFromRenameFunction,
  getCategorizeField,
} from './query_parsing_helpers';
import { monaco } from '@kbn/monaco';
import { parse, walk } from '@kbn/esql-ast';
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

      const idxPattern9 = getIndexPatternFromESQLQuery('FROM foo-1, foo-2 metadata _id');
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

      const idxPattern14 = getIndexPatternFromESQLQuery('TS tsdb');
      expect(idxPattern14).toBe('tsdb');

      const idxPattern15 = getIndexPatternFromESQLQuery('TS tsdb | STATS max(cpu) BY host');
      expect(idxPattern15).toBe('tsdb');

      const idxPattern16 = getIndexPatternFromESQLQuery(
        'TS pods | STATS load=avg(cpu), writes=max(rate(indexing_requests)) BY pod | SORT pod'
      );
      expect(idxPattern16).toBe('pods');

      const idxPattern17 = getIndexPatternFromESQLQuery('FROM "$foo%"');
      expect(idxPattern17).toBe('$foo%');

      const idxPattern18 = getIndexPatternFromESQLQuery('FROM """foo-{{mm-dd_yy}}"""');
      expect(idxPattern18).toBe('foo-{{mm-dd_yy}}');

      const idxPattern19 = getIndexPatternFromESQLQuery('FROM foo-1::data');
      expect(idxPattern19).toBe('foo-1::data');
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

    it('should return false for timeseries with no aggregation', () => {
      expect(hasTransformationalCommand('ts a')).toBeFalsy();
    });

    it('should return true for timeseries with aggregations', () => {
      expect(hasTransformationalCommand('ts a | stats var = avg(b)')).toBeTruthy();
    });
  });

  describe('getTimeFieldFromESQLQuery', () => {
    it('should return undefined if there are no time params', () => {
      expect(getTimeFieldFromESQLQuery('from a | eval b = 1')).toBeUndefined();
    });

    it('should return the time field if there is at least one time param', () => {
      expect(getTimeFieldFromESQLQuery('from a | eval b = 1 | where time >= ?_tstart')).toBe(
        'time'
      );
    });

    it('should return undefined if there is one named param but is not ?_tstart or ?_tend', () => {
      expect(
        getTimeFieldFromESQLQuery('from a | eval b = 1 | where time >= ?late')
      ).toBeUndefined();
    });

    it('should return undefined if there is one named param but is used without a time field', () => {
      expect(
        getTimeFieldFromESQLQuery('from a | eval b = DATE_TRUNC(1 day, ?_tstart)')
      ).toBeUndefined();
    });

    it('should return the time field if there is at least one time param in the bucket function', () => {
      expect(
        getTimeFieldFromESQLQuery(
          'from a | stats meow = avg(bytes) by bucket(event.timefield, 200, ?_tstart, ?_tend)'
        )
      ).toBe('event.timefield');
    });

    it('should return the time field if the column is casted', () => {
      expect(
        getTimeFieldFromESQLQuery(
          'from a | WHERE date_nanos::date >= ?_tstart AND date_nanos::date <= ?_tend'
        )
      ).toBe('date_nanos');
    });
  });

  describe('isQueryWrappedByPipes', function () {
    it('should return false if the query is not wrapped', function () {
      const flag = isQueryWrappedByPipes('FROM index1 | KEEP field1, field2 | SORT field1');
      expect(flag).toBeFalsy();
    });

    it('should return true if the query is wrapped', function () {
      const flag = isQueryWrappedByPipes('FROM index1 /n| KEEP field1, field2 /n| SORT field1');
      expect(flag).toBeTruthy();
    });

    it('should return true if the query is wrapped and prettified', function () {
      const flag = isQueryWrappedByPipes('FROM index1 /n  | KEEP field1, field2 /n  | SORT field1');
      expect(flag).toBeTruthy();
    });
  });

  describe('retrieveMetadataColumns', () => {
    it('should return metadata columns if they exist', () => {
      expect(retrieveMetadataColumns('from a  metadata _id, _ignored | eval b = 1')).toStrictEqual([
        '_id',
        '_ignored',
      ]);
    });

    it('should return empty columns if metadata doesnt exist', () => {
      expect(retrieveMetadataColumns('from a | eval b = 1')).toStrictEqual([]);
    });
  });

  describe('getQueryColumnsFromESQLQuery', () => {
    it('should return the columns used in stats', () => {
      expect(
        getQueryColumnsFromESQLQuery('from a | stats var0 = avg(bytes) by dest')
      ).toStrictEqual(['var0', 'bytes', 'dest']);
    });

    it('should return the columns used in eval', () => {
      expect(
        getQueryColumnsFromESQLQuery('from a | eval dest = geo.dest, var1 = bytes')
      ).toStrictEqual(['dest', 'geo.dest', 'var1', 'bytes']);
    });

    it('should return the columns used in eval and stats', () => {
      expect(
        getQueryColumnsFromESQLQuery('from a | stats var0 = avg(bytes) by dest | eval meow = var0')
      ).toStrictEqual(['var0', 'bytes', 'dest', 'meow', 'var0']);
    });

    it('should return the metadata columns', () => {
      expect(
        getQueryColumnsFromESQLQuery('from a  metadata _id, _ignored | eval b = 1')
      ).toStrictEqual(['_id', '_ignored', 'b']);
    });

    it('should return the keep columns', () => {
      expect(getQueryColumnsFromESQLQuery('from a | keep b, c, d')).toStrictEqual(['b', 'c', 'd']);
    });

    it('should return the where columns', () => {
      expect(
        getQueryColumnsFromESQLQuery('from a | where field > 1000 and abs(fieldb) < 20')
      ).toStrictEqual(['field', 'fieldb']);
    });

    it('should return the rename columns', () => {
      expect(getQueryColumnsFromESQLQuery('from a | rename field as fieldb')).toStrictEqual([
        'field',
        'fieldb',
      ]);
    });
  });

  describe('mapVariableToColumn', () => {
    it('should return the columns as they are if no variables are defined', () => {
      const esql = 'FROM a | EVAL b = 1';
      const variables: ESQLControlVariable[] = [];
      const columns = [{ id: 'b', name: 'b', meta: { type: 'number' } }] as DatatableColumn[];
      expect(mapVariableToColumn(esql, variables, columns)).toStrictEqual(columns);
    });

    it('should return the columns as they are if variables do not match', () => {
      const esql = 'FROM logstash-* | STATS COUNT(*) BY ?field | LIMIT 10';
      const variables = [
        {
          key: 'interval',
          value: '5 minutes',
          type: ESQLVariableType.TIME_LITERAL,
        },
      ];
      const columns = [
        {
          id: 'COUNT(*)',
          name: 'COUNT(*)',
          meta: {
            type: 'number',
            esType: 'long',
            sourceParams: {
              indexPattern: 'logstash-*',
            },
          },
          isNull: false,
        },
        {
          id: 'clientip',
          name: 'clientip',
          meta: {
            type: 'ip',
            esType: 'ip',
            sourceParams: {
              indexPattern: 'logstash-*',
            },
          },
          isNull: false,
        },
      ] as DatatableColumn[];
      expect(mapVariableToColumn(esql, variables, columns)).toStrictEqual(columns);
    });

    it('should return the columns enhanced with the corresponsing variables for a field type variable', () => {
      const esql = 'FROM logstash-* | STATS COUNT(*) BY ?field | LIMIT 10 ';
      const variables = [
        {
          key: 'field',
          value: 'clientip',
          type: ESQLVariableType.FIELDS,
        },
        {
          key: 'interval',
          value: '5 minutes',
          type: ESQLVariableType.TIME_LITERAL,
        },
        {
          key: 'agent_name',
          value: 'go',
          type: ESQLVariableType.VALUES,
        },
      ];
      const columns = [
        {
          id: 'COUNT(*)',
          name: 'COUNT(*)',
          meta: {
            type: 'number',
            esType: 'long',
            sourceParams: {
              indexPattern: 'logstash-*',
            },
          },
          isNull: false,
        },
        {
          id: 'clientip',
          name: 'clientip',
          meta: {
            type: 'ip',
            esType: 'ip',
            sourceParams: {
              indexPattern: 'logstash-*',
            },
          },
          isNull: false,
        },
      ] as DatatableColumn[];
      const expectedColumns = columns;
      expectedColumns[1].variable = 'field';
      expect(mapVariableToColumn(esql, variables, columns)).toStrictEqual(expectedColumns);
    });

    it('should return the columns enhanced with the corresponsing variables for a time_literal type variable', () => {
      const esql = 'FROM logs* | STATS COUNT(*) BY BUCKET(@timestamp, ?interval)';
      const variables = [
        {
          key: 'field',
          value: 'clientip',
          type: ESQLVariableType.FIELDS,
        },
        {
          key: 'interval',
          value: '5 minutes',
          type: ESQLVariableType.TIME_LITERAL,
        },
        {
          key: 'agent_name',
          value: 'go',
          type: ESQLVariableType.VALUES,
        },
      ];
      const columns = [
        {
          id: 'COUNT(*)',
          name: 'COUNT(*)',
          meta: {
            type: 'number',
            esType: 'long',
            sourceParams: {
              indexPattern: 'logs*',
            },
          },
          isNull: false,
        },
        {
          id: 'BUCKET(@timestamp, ?interval)',
          name: 'BUCKET(@timestamp, ?interval)',
          meta: {
            type: 'date',
            esType: 'date',
            sourceParams: {
              appliedTimeRange: {
                from: 'now-30d/d',
                to: 'now',
              },
              params: {},
              indexPattern: 'logs*',
            },
          },
          isNull: false,
        },
      ] as DatatableColumn[];
      const expectedColumns = columns;
      expectedColumns[1].variable = 'interval';
      expect(mapVariableToColumn(esql, variables, columns)).toStrictEqual(expectedColumns);
    });

    it('should return the columns enhanced with the corresponsing variables for a values type variable', () => {
      const esql = 'FROM logs* | WHERE agent.name == ?agent_name';
      const variables = [
        {
          key: 'field',
          value: 'clientip',
          type: ESQLVariableType.FIELDS,
        },
        {
          key: 'interval',
          value: '5 minutes',
          type: ESQLVariableType.TIME_LITERAL,
        },
        {
          key: 'agent_name',
          value: 'go',
          type: ESQLVariableType.VALUES,
        },
      ];
      const columns = [
        {
          id: '@timestamp',
          isNull: false,
          meta: { type: 'date', esType: 'date' },
          name: '@timestamp',
        },
        {
          id: 'agent.name',
          isNull: false,
          meta: { type: 'string', esType: 'keyword' },
          name: 'agent.name',
        },
      ] as DatatableColumn[];
      const expectedColumns = columns;
      expectedColumns[1].variable = 'agent_name';
      expect(mapVariableToColumn(esql, variables, columns)).toStrictEqual(expectedColumns);
    });

    it('should return the columns as they are if the variable field is dropped', () => {
      const esql = 'FROM logs* | WHERE agent.name == ?agent_name | DROP agent.name';
      const variables = [
        {
          key: 'field',
          value: 'clientip',
          type: ESQLVariableType.FIELDS,
        },
        {
          key: 'interval',
          value: '5 minutes',
          type: ESQLVariableType.TIME_LITERAL,
        },
        {
          key: 'agent_name',
          value: 'go',
          type: ESQLVariableType.VALUES,
        },
      ];
      const columns = [
        {
          id: '@timestamp',
          isNull: false,
          meta: { type: 'date', esType: 'date' },
          name: '@timestamp',
        },
      ] as DatatableColumn[];
      expect(mapVariableToColumn(esql, variables, columns)).toStrictEqual(columns);
    });

    it('should return the columns correctly if variable is used in KEEP', () => {
      const esql = 'FROM logstash-* | KEEP bytes, ?field';
      const variables = [
        {
          key: 'field',
          value: 'clientip',
          type: ESQLVariableType.FIELDS,
        },
        {
          key: 'interval',
          value: '5 minutes',
          type: ESQLVariableType.TIME_LITERAL,
        },
        {
          key: 'agent_name',
          value: 'go',
          type: ESQLVariableType.VALUES,
        },
      ];
      const columns = [
        {
          id: 'bytes',
          isNull: false,
          meta: { type: 'number', esType: 'long' },
          name: 'bytes',
        },
        {
          id: 'clientip',
          name: 'clientip',
          meta: {
            type: 'ip',
            esType: 'ip',
            sourceParams: {
              indexPattern: 'logstash-*',
            },
          },
          isNull: false,
        },
      ] as DatatableColumn[];
      const expectedColumns = columns;
      expectedColumns[1].variable = 'field';
      expect(mapVariableToColumn(esql, variables, columns)).toStrictEqual(expectedColumns);
    });
  });

  describe('getValuesFromQueryField', () => {
    it('should return the values from the query field', () => {
      const queryString = 'FROM my_index | WHERE my_field ==';
      const values = getValuesFromQueryField(queryString);
      expect(values).toEqual('my_field');
    });

    it('should return the values from the query field when cursor is not at the end', () => {
      const queryString = 'FROM my_index | WHERE my_field >= | STATS COUNT(*)';
      const values = getValuesFromQueryField(queryString, {
        lineNumber: 1,
        column: 33,
      } as monaco.Position);
      expect(values).toEqual('my_field');
    });

    it('should return the values from the query field with new lines', () => {
      const queryString = 'FROM my_index \n| WHERE my_field >=';
      const values = getValuesFromQueryField(queryString);
      expect(values).toEqual('my_field');
    });

    it('should return the values from the query field with new lines when cursor is not at the end', () => {
      const queryString = 'FROM my_index \n| WHERE my_field >= \n| STATS COUNT(*)';
      const values = getValuesFromQueryField(queryString, {
        lineNumber: 2,
        column: 36,
      } as monaco.Position);
      expect(values).toEqual('my_field');
    });

    it('should return undefined if no column is found', () => {
      const queryString = 'FROM my_index | STATS COUNT() ';
      const values = getValuesFromQueryField(queryString, {
        lineNumber: 1,
        column: 31,
      } as monaco.Position);
      expect(values).toEqual(undefined);
    });

    it('should return undefined if the column is *', () => {
      const queryString = 'FROM my_index | STATS COUNT(*) ';
      const values = getValuesFromQueryField(queryString, {
        lineNumber: 1,
        column: 31,
      } as monaco.Position);
      expect(values).toEqual(undefined);
    });

    it('should return undefined if the query has a questionmark at the last position', () => {
      const queryString = 'FROM my_index | STATS COUNT() BY ?';
      const values = getValuesFromQueryField(queryString, {
        lineNumber: 1,
        column: 34,
      } as monaco.Position);
      expect(values).toEqual(undefined);
    });

    it('should return undefined if the query has a questionmark at the second last position', () => {
      const queryString = 'FROM my_index | STATS PERCENTILE(bytes, ?)';
      const values = getValuesFromQueryField(queryString, {
        lineNumber: 1,
        column: 42,
      } as monaco.Position);
      expect(values).toEqual(undefined);
    });

    it('should return undefined if the query has a questionmark at the last cursor position', () => {
      const queryString =
        'FROM my_index | STATS COUNT() BY BUCKET(@timestamp, ?, ?_tstart, ?_tend)';
      const values = getValuesFromQueryField(queryString, {
        lineNumber: 1,
        column: 52,
      } as monaco.Position);
      expect(values).toEqual(undefined);
    });
  });

  describe('fixESQLQueryWithVariables', () => {
    it('should return the query as is if no variables are given', () => {
      const esql = 'FROM my_index | STATS COUNT(?field)';
      const variables: ESQLControlVariable[] = [];
      expect(fixESQLQueryWithVariables(esql, variables)).toEqual(esql);
    });

    it('should return the query as is if no fields or functions variables are given', () => {
      const esql = 'FROM my_index | WHERE field == ?value';
      const variables: ESQLControlVariable[] = [
        {
          key: 'interval',
          value: '5 minutes',
          type: ESQLVariableType.TIME_LITERAL,
        },
        {
          key: 'agent_name',
          value: 'go',
          type: ESQLVariableType.VALUES,
        },
      ];
      expect(fixESQLQueryWithVariables(esql, variables)).toEqual(esql);
    });

    it('should return the query as is if fields or functions variables are given but they are already used with ??', () => {
      const esql = 'FROM my_index | STATS COUNT(??field)';
      const variables: ESQLControlVariable[] = [
        {
          key: 'interval',
          value: '5 minutes',
          type: ESQLVariableType.TIME_LITERAL,
        },
        {
          key: 'agent_name',
          value: 'go',
          type: ESQLVariableType.VALUES,
        },
        {
          key: 'field',
          value: 'bytes',
          type: ESQLVariableType.FIELDS,
        },
      ];
      expect(fixESQLQueryWithVariables(esql, variables)).toEqual(esql);
    });

    it('should fix the query if fields or functions variables are given and they are already used with ?', () => {
      const esql = 'FROM my_index | STATS COUNT(?field)';
      const expected = 'FROM my_index | STATS COUNT(??field)';
      const variables: ESQLControlVariable[] = [
        {
          key: 'interval',
          value: '5 minutes',
          type: ESQLVariableType.TIME_LITERAL,
        },
        {
          key: 'agent_name',
          value: 'go',
          type: ESQLVariableType.VALUES,
        },
        {
          key: 'field',
          value: 'bytes',
          type: ESQLVariableType.FIELDS,
        },
      ];
      expect(fixESQLQueryWithVariables(esql, variables)).toEqual(expected);
    });

    it('should fix a query with multiple variables', () => {
      const esql =
        'FROM my_index | STATS COUNT(?field) by ?breakdownField | WHERE agent.name == ?agent_name';
      const expected =
        'FROM my_index | STATS COUNT(??field) by ??breakdownField | WHERE agent.name == ?agent_name';
      const variables: ESQLControlVariable[] = [
        {
          key: 'interval',
          value: '5 minutes',
          type: ESQLVariableType.TIME_LITERAL,
        },
        {
          key: 'agent_name',
          value: 'go',
          type: ESQLVariableType.VALUES,
        },
        {
          key: 'field',
          value: 'bytes',
          type: ESQLVariableType.FIELDS,
        },
        {
          key: 'breakdownField',
          value: 'clientip',
          type: ESQLVariableType.FIELDS,
        },
      ];
      expect(fixESQLQueryWithVariables(esql, variables)).toEqual(expected);
    });
  });

  describe('getCategorizeColumns', () => {
    it('should return the columns used in categorize', () => {
      const esql = 'FROM index | STATS COUNT() BY categorize(field1)';
      const expected = ['categorize(field1)'];
      expect(getCategorizeColumns(esql)).toEqual(expected);
    });

    it('should return the columns used in categorize for multiple breakdowns', () => {
      const esql = 'FROM index | STATS COUNT() BY categorize(field1), field2';
      const expected = ['categorize(field1)'];
      expect(getCategorizeColumns(esql)).toEqual(expected);
    });

    it('should return the columns used in categorize for multiple breakdowns with BUCKET', () => {
      const esql =
        'FROM index | STATS count_per_day = COUNT() BY Pattern=CATEGORIZE(message), @timestamp=BUCKET(@timestamp, 1 day)';
      const expected = ['Pattern'];
      expect(getCategorizeColumns(esql)).toEqual(expected);
    });

    it('should return the columns used in categorize if the result is stored in a new column', () => {
      const esql = 'FROM index | STATS COUNT() BY pattern = categorize(field1)';
      const expected = ['pattern'];
      expect(getCategorizeColumns(esql)).toEqual(expected);
    });

    it('should return the columns used in categorize for a complex query', () => {
      const esql =
        'FROM index | STATS count_per_day = COUNT() BY Pattern=CATEGORIZE(message), @timestamp=BUCKET(@timestamp, 1 day) | STATS COUNT() BY buckets, pattern = categorize(field1) | STATS Count=SUM(count_per_day), Trend=VALUES(count_per_day) BY Pattern';
      const expected = ['Pattern'];
      expect(getCategorizeColumns(esql)).toEqual(expected);
    });

    it('should return the columns used in categorize if there is a rename', () => {
      const esql =
        'FROM index | STATS COUNT() BY CATEGORIZE(field1) | RENAME `CATEGORIZE(field1)` AS pattern';
      const expected = ['pattern'];
      expect(getCategorizeColumns(esql)).toEqual(expected);

      const esql1 =
        'FROM index | STATS COUNT() BY pattern = CATEGORIZE(field1) | RENAME pattern AS meow';
      const expected1 = ['meow'];
      expect(getCategorizeColumns(esql1)).toEqual(expected1);
    });

    it('should return an empty array if no categorize is present', () => {
      const esql = 'FROM index | STATS COUNT() BY field1';
      const expected: string[] = [];
      expect(getCategorizeColumns(esql)).toEqual(expected);
    });
  });

  describe('getArgsFromRenameFunction', () => {
    it('should return the args from an = rename function', () => {
      const esql = 'FROM index | RENAME renamed = original';
      const { root } = parse(esql);
      let renameFunction;
      walk(root, {
        visitFunction: (node) => (renameFunction = node),
      });

      expect(getArgsFromRenameFunction(renameFunction!)).toMatchObject({
        original: { name: 'original' },
        renamed: { name: 'renamed' },
      });
    });

    it('should return the args from an AS rename function', () => {
      const esql = 'FROM index | RENAME original AS renamed';
      const { root } = parse(esql);
      let renameFunction;
      walk(root, {
        visitFunction: (node) => (renameFunction = node),
      });

      expect(getArgsFromRenameFunction(renameFunction!)).toMatchObject({
        original: { name: 'original' },
        renamed: { name: 'renamed' },
      });
    });
  });

  describe('getCategorizeField', () => {
    it('should return the field used in categorize', () => {
      const esql = 'FROM index | STATS COUNT() BY categorize(field1)';
      const expected = ['field1'];
      expect(getCategorizeField(esql)).toEqual(expected);
    });

    it('should return the field used in categorize for multiple breakdowns', () => {
      const esql = 'FROM index | STATS COUNT() BY categorize(field1), field2';
      const expected = ['field1'];
      expect(getCategorizeField(esql)).toEqual(expected);
    });

    it('should return the field used in categorize for multiple breakdowns with BUCKET', () => {
      const esql =
        'FROM index | STATS count_per_day = COUNT() BY Pattern=CATEGORIZE(message), @timestamp=BUCKET(@timestamp, 1 day)';
      const expected = ['message'];
      expect(getCategorizeField(esql)).toEqual(expected);
    });

    it('should return the field used in categorize if the result is stored in a new column', () => {
      const esql = 'FROM index | STATS COUNT() BY pattern = categorize(field1)';
      const expected = ['field1'];
      expect(getCategorizeField(esql)).toEqual(expected);
    });

    it('should return the field used in categorize for a complex query', () => {
      const esql =
        'FROM index | STATS count_per_day = COUNT() BY Pattern=CATEGORIZE(message), @timestamp=BUCKET(@timestamp, 1 day)  | STATS Count=SUM(count_per_day), Trend=VALUES(count_per_day) BY Pattern';
      const expected = ['message'];
      expect(getCategorizeField(esql)).toEqual(expected);
    });
    it('should return an empty array if no categorize is present', () => {
      const esql = 'FROM index | STATS COUNT() BY field1';
      const expected: string[] = [];
      expect(getCategorizeField(esql)).toEqual(expected);
    });
  });
});
