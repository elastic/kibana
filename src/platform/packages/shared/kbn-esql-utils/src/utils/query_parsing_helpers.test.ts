/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { monaco } from '@kbn/monaco';
import type { ESQLColumn } from '@elastic/esql/types';
import { Parser, walk } from '@elastic/esql';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import {
  getRemoteClustersFromESQLQuery,
  getLimitFromESQLQuery,
  removeDropCommandsFromESQLQuery,
  hasTransformationalCommand,
  getTimeFieldFromESQLQuery,
  prettifyQuery,
  retrieveMetadataColumns,
  getQueryColumnsFromESQLQuery,
  mapVariableToColumn,
  getValuesFromQueryField,
  fixESQLQueryWithVariables,
  getCategorizeColumns,
  getArgsFromRenameFunction,
  getCategorizeField,
  findClosestColumn,
  getKqlSearchQueries,
  convertTimeseriesCommandToFrom,
  hasLimitBeforeAggregate,
  missingSortBeforeLimit,
  hasOnlySourceCommand,
  hasTimeseriesInfoCommand,
  getSparklineColumns,
  hasChangePointCommand,
  getChangePointOutputColumnNames,
  getChangePointSeriesColumns,
  buildChangePointLineDataQuery,
  appendEntityFiltersToChangePointLineEsql,
  formatEsqlIdentifier,
  formatEsqlLiteral,
} from './query_parsing_helpers';

describe('esql query helpers', () => {
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

    it('should return true for fork with all branches containing only transformational commands', () => {
      expect(
        hasTransformationalCommand('from a | fork (stats count() by field1) (keep field2, field3)')
      ).toBeTruthy();
    });

    it('should return false for fork with non-transformational commands in branches', () => {
      expect(
        hasTransformationalCommand('from a | fork (where field1 > 0) (eval field2 = field1 * 2)')
      ).toBeFalsy();
    });

    it('should return false for fork with mixed transformational and non-transformational commands', () => {
      expect(
        hasTransformationalCommand('from a | fork (stats count() by field1) (where field2 > 0)')
      ).toBeFalsy();
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

    it('should return @timestamp for PromQL if there is at least one time param', () => {
      expect(
        getTimeFieldFromESQLQuery(
          'PROMQL index = index1 step="5m" start=?_tstart end=?_tend avg(bytes) '
        )
      ).toBe('@timestamp');
    });

    it('should return @timestamp for PromQL if there is no time param', () => {
      expect(getTimeFieldFromESQLQuery('PROMQL index = index1 step="5m" ')).toBe('@timestamp');
    });
  });

  describe('getKqlSearchQueries', () => {
    it('should return an empty array for a regular ES|QL query', () => {
      expect(getKqlSearchQueries('from a | where field == "value"')).toStrictEqual([]);
    });

    it('should return an empty array if there are no search functions', () => {
      expect(getKqlSearchQueries('from a | eval b = 1')).toStrictEqual([]);
    });

    it("should return a KQL query when it's embedded in ES|QL query", () => {
      expect(getKqlSearchQueries('FROM a | WHERE KQL("""field : "value" """)')).toStrictEqual([
        'field : "value"',
      ]);
    });

    it('should correctly parse KQL full text embedded query', () => {
      expect(getKqlSearchQueries('FROM a | WHERE KQL("""full text""")')).toStrictEqual([
        'full text',
      ]);
    });

    it('should correctly parse long queries', () => {
      expect(
        getKqlSearchQueries(
          'From a | WHERE KQL("""(category.keyword : "Men\'s Clothing" or customer_first_name.keyword : * ) AND category.keyword : "Women\'s Accessories" """)'
        )
      ).toStrictEqual([
        '(category.keyword : "Men\'s Clothing" or customer_first_name.keyword : * ) AND category.keyword : "Women\'s Accessories"',
      ]);
    });

    it('should correctly parse mixed queries, omitting ES|QL valid syntax', () => {
      expect(
        getKqlSearchQueries(
          'From a | WHERE KQL("""field1: "value1" """) OR field == "value" AND KQL("""field2:value2""")'
        )
      ).toStrictEqual(['field1: "value1"', 'field2:value2']);
    });
  });

  describe('prettifyQuery', function () {
    it('should return the code wrapped', function () {
      const code = prettifyQuery('FROM index1 | KEEP field1, field2 | SORT field1');
      expect(code).toEqual('FROM index1\n  | KEEP field1, field2\n  | SORT field1');
    });

    it('should return the code wrapped with comments', function () {
      const code = prettifyQuery(
        'FROM index1 /* cmt */ | KEEP field1, field2 /* cmt */ | SORT field1 /* cmt */'
      );
      expect(code).toEqual(
        'FROM index1 /* cmt */\n  | KEEP field1, field2 /* cmt */\n  | SORT field1 /* cmt */'
      );
    });

    it('should respect custom lineWidth when provided', function () {
      const query =
        'FROM kibana_sample_data_logs | STATS count = COUNT(*), avg = AVG(bytes), p95 = PERCENTILE(bytes, 95), ext = VALUES(tags.keyword) BY ip | EVAL newField = CASE(count < 100, "groupA", count > 100 AND count < 500, "groupB", "Other") | KEEP newField';
      const codeWithNarrowWidth = prettifyQuery(query, 40);
      const codeWithWideWidth = prettifyQuery(query, 120);
      const maxLineLength = (code: string) =>
        Math.max(...code.split('\n').map((line) => line.length));
      expect(maxLineLength(codeWithNarrowWidth)).toBeLessThanOrEqual(40);
      expect(maxLineLength(codeWithWideWidth)).toBeLessThanOrEqual(120);
      // Wider width should allow longer lines (fewer wraps)
      expect(maxLineLength(codeWithWideWidth)).toBeGreaterThanOrEqual(
        maxLineLength(codeWithNarrowWidth)
      );
    });
  });

  describe('convertTimeseriesCommandToFrom', function () {
    it('should return the query as it is if no TS command is found', function () {
      const query = convertTimeseriesCommandToFrom(
        'FROM index1 | KEEP field1, field2 | SORT field1'
      );
      expect(query).toEqual('FROM index1 | KEEP field1, field2 | SORT field1');
    });

    it('should return the query with FROM command if TS command is found', function () {
      const query = convertTimeseriesCommandToFrom('TS index1 | KEEP field1, field2 | SORT field1');
      expect(query).toEqual('FROM index1 | KEEP field1, field2 | SORT field1');
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

  describe('findClosestColumn', () => {
    const mockColumns: ESQLColumn[] = [
      {
        args: [],
        location: { min: 10, max: 15 },
        text: 'col1',
        incomplete: false,
        parts: ['col1'],
        quoted: false,
        name: 'col1',
        type: 'column',
      },
      {
        args: [],
        location: { min: 20, max: 25 },
        text: 'col2',
        incomplete: false,
        parts: ['col2'],
        quoted: false,
        name: 'col2',
        type: 'column',
      },
      {
        args: [],
        location: { min: 30, max: 40 },
        text: 'col3.sub',
        incomplete: false,
        parts: ['col3', 'sub'],
        quoted: false,
        name: 'col3.sub',
        type: 'column',
      },
      {
        args: [],
        location: { min: 56, max: 63 },
        text: 'clientip',
        incomplete: false,
        parts: ['clientip'],
        quoted: false,
        name: 'clientip',
        type: 'column',
      },
    ];

    it('should return undefined if the columns array is empty', () => {
      const cursor = { lineNumber: 1, column: 5 } as monaco.Position;
      expect(findClosestColumn([], cursor)).toBeUndefined();
    });

    it('should return the column if the cursor is exactly at its min boundary', () => {
      const cursor = { lineNumber: 1, column: 10 } as monaco.Position;
      expect(findClosestColumn(mockColumns, cursor)).toEqual(mockColumns[0]); // col1
    });

    it('should return the column if the cursor is exactly at its max boundary', () => {
      const cursor = { lineNumber: 1, column: 15 } as monaco.Position;
      expect(findClosestColumn(mockColumns, cursor)).toEqual(mockColumns[0]); // col1
    });

    it('should return the column if the cursor is inside its range', () => {
      const cursor = { lineNumber: 1, column: 12 } as monaco.Position;
      expect(findClosestColumn(mockColumns, cursor)).toEqual(mockColumns[0]); // col1

      const cursor2 = { lineNumber: 1, column: 35 } as monaco.Position;
      expect(findClosestColumn(mockColumns, cursor2)).toEqual(mockColumns[2]); // col3.sub
    });

    it('should return the closest column when cursor is between two columns (closer to the first)', () => {
      const cursor = { lineNumber: 1, column: 17 } as monaco.Position; // 2 units from col1.max, 3 units from col2.min
      expect(findClosestColumn(mockColumns, cursor)).toEqual(mockColumns[0]); // col1
    });

    it('should return the closest column when cursor is between two columns (closer to the second)', () => {
      const cursor = { lineNumber: 1, column: 18 } as monaco.Position; // 3 units from col1.max, 2 units from col2.min
      expect(findClosestColumn(mockColumns, cursor)).toEqual(mockColumns[1]); // col2
    });

    it('should return the closest column when cursor is far to the left of all columns', () => {
      const cursor = { lineNumber: 1, column: 5 } as monaco.Position;
      expect(findClosestColumn(mockColumns, cursor)).toEqual(mockColumns[0]); // col1
    });

    it('should return the closest column when cursor is far to the right of all columns', () => {
      const cursor = { lineNumber: 1, column: 70 } as monaco.Position;
      expect(findClosestColumn(mockColumns, cursor)).toEqual(mockColumns[3]); // clientip
    });

    it('should correctly identify column when cursor is just outside max of previous column', () => {
      const cursor = { lineNumber: 1, column: 26 } as monaco.Position; // Just past col2.max (25)
      expect(findClosestColumn(mockColumns, cursor)).toEqual(mockColumns[1]); // col2 (closest boundary is 25)
    });

    it('should prioritize the first found if distances are exactly equal (edge case for between columns)', () => {
      const equidistantColumns: ESQLColumn[] = [
        { ...mockColumns[0], location: { min: 10, max: 12 } },
        { ...mockColumns[1], location: { min: 14, max: 16 } },
      ];
      const cursor = { lineNumber: 1, column: 13 } as monaco.Position; // 1 unit from col1.max, 1 unit from col2.min
      expect(findClosestColumn(equidistantColumns, cursor)).toEqual(equidistantColumns[0]);
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

    it('should return the values from the query when we have more than one columns', () => {
      const queryString = 'FROM my_index | WHERE my_field >= 1200 AND another_field == ';
      const values = getValuesFromQueryField(queryString, {
        lineNumber: 1,
        column: 63,
      } as monaco.Position);
      expect(values).toEqual('another_field');
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
      const { root } = Parser.parse(esql);
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
      const { root } = Parser.parse(esql);
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

  describe('getSparklineColumns', () => {
    it('should return sparkline alias and not inner column refs (patterns-style query)', () => {
      const esql =
        'FROM kibana_sample_data_logs | STATS Count = COUNT(*), Sparkline=SPARKLINE(Count(*), @timestamp, 40, ?_tstart, ?_tend) BY Pattern=CATEGORIZE(message) | SORT Count DESC';
      expect(getSparklineColumns(esql)).toEqual(['Sparkline']);
    });

    it('should return bare SPARKLINE expression as column id using source text', () => {
      const esql =
        'FROM index | STATS SPARKLINE(COUNT(*), @timestamp, 10, ?_tstart, ?_tend) BY Pattern=CATEGORIZE(msg)';
      expect(getSparklineColumns(esql)).toEqual([
        'SPARKLINE(COUNT(*), @timestamp, 10, ?_tstart, ?_tend)',
      ]);
    });

    it('should not treat unrelated stats columns as sparklines based on name text', () => {
      const esql = 'FROM index | STATS my_sparkline_metric = COUNT(*) BY Pattern=CATEGORIZE(msg)';
      expect(getSparklineColumns(esql)).toEqual([]);
    });

    it('should apply every RENAME command in pipeline order', () => {
      const esql =
        'FROM index | STATS Sparkline=SPARKLINE(COUNT(*), @ts, 5, ?_a, ?_b) BY Pattern=CATEGORIZE(m) | RENAME Sparkline AS S1 | RENAME S1 AS S2';
      expect(getSparklineColumns(esql)).toEqual(['S2']);
    });

    it('should return sparkline alias from INLINE STATS', () => {
      const esql =
        'FROM index | INLINE STATS my_spark = SPARKLINE(COUNT(*), @timestamp, 10, ?_tstart, ?_tend)';
      expect(getSparklineColumns(esql)).toEqual(['my_spark']);
    });

    it('should return bare SPARKLINE expression from INLINE STATS as column id using source text', () => {
      const esql =
        'FROM index | INLINE STATS SPARKLINE(COUNT(*), @timestamp, 10, ?_tstart, ?_tend)';
      expect(getSparklineColumns(esql)).toEqual([
        'SPARKLINE(COUNT(*), @timestamp, 10, ?_tstart, ?_tend)',
      ]);
    });

    it('should collect sparkline columns from both STATS and INLINE STATS in the same query', () => {
      const esql =
        'FROM index | STATS stats_spark = SPARKLINE(bytes) BY host | INLINE STATS inline_spark = SPARKLINE(requests)';
      expect(getSparklineColumns(esql)).toEqual(['stats_spark', 'inline_spark']);
    });

    it('should apply RENAME to INLINE STATS sparkline columns', () => {
      const esql =
        'FROM index | INLINE STATS Spark = SPARKLINE(COUNT(*), @ts, 5, ?_a, ?_b) | RENAME Spark AS MySpark';
      expect(getSparklineColumns(esql)).toEqual(['MySpark']);
    });

    it('should return source text for bare SPARKLINE alongside an aliased SPARKLINE in the same STATS', () => {
      const esql =
        'FROM logs | STATS sparkline = SPARKLINE(AVG(bytes), timestamp, 50, ?_tstart, ?_tend), SPARKLINE(COUNT(*), timestamp, 50, ?_tstart, ?_tend), Count = COUNT(*) BY clientip';
      expect(getSparklineColumns(esql)).toEqual([
        'sparkline',
        'SPARKLINE(COUNT(*), timestamp, 50, ?_tstart, ?_tend)',
      ]);
    });

    it('should handle SPARKLINE with an aggregate inline WHERE filter', () => {
      const esql =
        'FROM employees | STATS sparkline = SPARKLINE(COUNT(*), hire_date, 20, "1985-01-01T00:00:00Z", "1985-12-31T00:00:00Z") WHERE gender == "M"';
      expect(getSparklineColumns(esql)).toEqual(['sparkline']);
    });

    it('should collect sparkline columns from multiple consecutive STATS commands', () => {
      const esql =
        'FROM employees | STATS s1 = SPARKLINE(MAX(salary), hire_date, 20, "1985-01-01T00:00:00Z", "1986-12-31T00:00:00Z") BY bucket_date = BUCKET(hire_date, 1year) | STATS s2 = SPARKLINE(SUM(salary), bucket_date, 12, "1985-01-01T00:00:00Z", "1985-12-31T00:00:00Z")';
      expect(getSparklineColumns(esql)).toEqual(['s1', 's2']);
    });

    it('should not include non-sparkline aggregates from mixed STATS', () => {
      const esql =
        'FROM employees | STATS s = SPARKLINE(COUNT(*), hire_date, 20, "1985-01-01T00:00:00Z", "1985-12-31T00:00:00Z"), c = COUNT(*), m = MAX(salary)';
      expect(getSparklineColumns(esql)).toEqual(['s']);
    });

    it('should detect sparkline in STATS after INLINE STATS that has no sparkline', () => {
      const esql =
        'FROM employees | INLINE STATS avg_height = AVG(height) BY gender | STATS s1 = SPARKLINE(AVG(salary), hire_date, 20, "1985-01-01T00:00:00Z", "1985-12-31T00:00:00Z")';
      expect(getSparklineColumns(esql)).toEqual(['s1']);
    });
  });

  describe('getRemoteClustersFromESQLQuery', () => {
    it('should return undefined for queries without remote clusters', () => {
      expect(getRemoteClustersFromESQLQuery('FROM foo')).toBeUndefined();
      expect(getRemoteClustersFromESQLQuery('FROM foo-1,foo-2')).toBeUndefined();
      expect(getRemoteClustersFromESQLQuery('FROM foo | STATS COUNT(*)')).toBeUndefined();
    });

    it('should return undefined for empty or undefined queries', () => {
      expect(getRemoteClustersFromESQLQuery('')).toBeUndefined();
      expect(getRemoteClustersFromESQLQuery()).toBeUndefined();
    });

    it('should extract remote clusters from FROM command', () => {
      expect(getRemoteClustersFromESQLQuery('FROM cluster1:index1')).toEqual(['cluster1']);
      expect(getRemoteClustersFromESQLQuery('FROM remote_cluster:foo-2')).toEqual([
        'remote_cluster',
      ]);
    });

    it('should extract multiple remote clusters from mixed indices', () => {
      expect(
        getRemoteClustersFromESQLQuery(
          'FROM local-index, cluster1:remote-index1, cluster2:remote-index2'
        )
      ).toEqual(['cluster1', 'cluster2']);
      expect(
        getRemoteClustersFromESQLQuery('FROM cluster1:index1, local-index, cluster2:index2')
      ).toEqual(['cluster1', 'cluster2']);
    });

    it('should extract remote clusters from TS command', () => {
      expect(getRemoteClustersFromESQLQuery('TS cluster1:tsdb')).toEqual(['cluster1']);
      expect(
        getRemoteClustersFromESQLQuery('TS remote_cluster:timeseries | STATS max(cpu) BY host')
      ).toEqual(['remote_cluster']);
    });

    it('should handle duplicate remote clusters', () => {
      expect(getRemoteClustersFromESQLQuery('FROM cluster1:index1, cluster1:index2')).toEqual([
        'cluster1',
      ]);
    });

    it('should handle wrapped in quotes', () => {
      expect(getRemoteClustersFromESQLQuery('FROM "cluster1:index1,cluster1:index2"')).toEqual([
        'cluster1',
      ]);

      expect(
        getRemoteClustersFromESQLQuery(
          'FROM "cluster1:index1,cluster1:index2", "cluster2:index3", cluster3:index3, index4'
        )
      ).toEqual(['cluster3', 'cluster1', 'cluster2']);
    });
  });

  describe('hasLimitBeforeAggregate', () => {
    it('should return false if the query is empty', () => {
      expect(hasLimitBeforeAggregate('')).toBe(false);
    });
    it('should return false if there is no limit', () => {
      expect(hasLimitBeforeAggregate('FROM index | STATS COUNT() BY field')).toBe(false);
    });
    it("should return false if it's just a limit without aggregate", () => {
      expect(hasLimitBeforeAggregate('FROM index | LIMIT 10')).toBe(false);
    });
    it('should return false if limit is after aggregate', () => {
      expect(hasLimitBeforeAggregate('FROM index | STATS COUNT() BY field | LIMIT 10')).toBe(false);
    });
    it('should return true if limit is before aggregate', () => {
      expect(hasLimitBeforeAggregate('FROM index | LIMIT 10 | STATS COUNT() BY field')).toBe(true);
    });
  });

  describe('missingSortBeforeLimit', () => {
    it('should return false if the query is empty', () => {
      expect(missingSortBeforeLimit('')).toBe(false);
    });
    it('should return false if there is no limit', () => {
      expect(missingSortBeforeLimit('FROM index | STATS COUNT() BY field')).toBe(false);
    });
    it("should return false if it's just a limit without sort", () => {
      expect(missingSortBeforeLimit('FROM index | LIMIT 10')).toBe(false);
    });
    it('should return false if sort is before limit', () => {
      expect(missingSortBeforeLimit('FROM index | SORT field | LIMIT 10')).toBe(false);
    });
    it('should return true if limit is before sort', () => {
      expect(missingSortBeforeLimit('FROM index | LIMIT 10 | SORT field')).toBe(true);
    });
  });

  describe('hasOnlySourceCommand', () => {
    it('should return true for queries with only FROM command', () => {
      expect(hasOnlySourceCommand('FROM index')).toBe(true);
    });

    it('should return true for queries with only TS command', () => {
      expect(hasOnlySourceCommand('TS index')).toBe(true);
    });

    it('should return false for queries with FROM and other commands', () => {
      expect(hasOnlySourceCommand('FROM index | STATS count()')).toBe(false);
    });

    it('should return false for queries with TS and other commands', () => {
      expect(hasOnlySourceCommand('TS index | WHERE field > 0')).toBe(false);
    });

    it('should return false for empty query', () => {
      expect(hasOnlySourceCommand('')).toBe(false);
    });

    it('should return false for queries with only PROMQL command', () => {
      expect(
        hasOnlySourceCommand(
          'PROMQL index = index1 step="5m" start=?_tstart end=?_tend avg(bytes) '
        )
      ).toBe(false);
    });
  });

  describe('hasChangePointCommand', () => {
    it('should return false for undefined or empty esql', () => {
      expect(hasChangePointCommand(undefined)).toBe(false);
      expect(hasChangePointCommand('')).toBe(false);
    });

    it('should return false when query has no CHANGE_POINT command', () => {
      expect(hasChangePointCommand('FROM index | STATS count = COUNT(*)')).toBe(false);
      expect(hasChangePointCommand('FROM index | WHERE field > 0')).toBe(false);
    });

    it('should return true when query contains CHANGE_POINT command', () => {
      expect(hasChangePointCommand('FROM a | CHANGE_POINT value')).toBe(true);
      expect(hasChangePointCommand('FROM a | CHANGE_POINT value ON key')).toBe(true);
      expect(
        hasChangePointCommand(
          'FROM a | STATS count = COUNT(*) BY bucket | CHANGE_POINT count ON bucket'
        )
      ).toBe(true);
    });

    it('should return false when CHANGE_POINT only appears inside FORK branches', () => {
      // FORK sub-queries are not top-level pipeline commands; the change-point data source
      // profile must not activate for FORK-only queries.
      const forkQuery = `FROM gallery-*
| FORK
  ( WHERE referer == "http://domainsigma.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | SORT bucket | CHANGE_POINT avg_bytes ON bucket )
  ( WHERE referer == "https://www.google.com/" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | SORT bucket | CHANGE_POINT avg_bytes ON bucket )
| WHERE type IS NOT NULL
| KEEP provider, bucket, avg_bytes, type, pvalue`;
      expect(hasChangePointCommand(forkQuery)).toBe(false);
    });

    it('should return true when CHANGE_POINT is a top-level command after FORK', () => {
      const mixedQuery = `FROM gallery-*
| FORK
  ( WHERE referer == "http://domainsigma.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | SORT bucket )
| CHANGE_POINT avg_bytes ON bucket`;
      expect(hasChangePointCommand(mixedQuery)).toBe(true);
    });
  });

  describe('getChangePointOutputColumnNames', () => {
    it('should return undefined for undefined or when no CHANGE_POINT command', () => {
      expect(getChangePointOutputColumnNames(undefined)).toBeUndefined();
      expect(getChangePointOutputColumnNames('FROM index')).toBeUndefined();
    });

    it('should return default type and pvalue column names when AS is not used', () => {
      const result = getChangePointOutputColumnNames('FROM a | CHANGE_POINT value');
      expect(result).toEqual({ typeColumn: 'type', pvalueColumn: 'pvalue' });
    });

    it('should return custom column names when AS type_name, pvalue_name is used', () => {
      const result = getChangePointOutputColumnNames(
        'FROM a | CHANGE_POINT value AS change_type, p_value'
      );
      expect(result?.typeColumn).toBe('change_type');
      expect(result?.pvalueColumn).toBe('p_value');
    });

    it('should return column names when CHANGE_POINT is inside FORK branches', () => {
      const forkQuery = `FROM gallery-*
| FORK
  ( WHERE referer == "http://a.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | SORT bucket | CHANGE_POINT avg_bytes ON bucket )
| WHERE type IS NOT NULL`;
      const result = getChangePointOutputColumnNames(forkQuery);
      expect(result).toEqual({ typeColumn: 'type', pvalueColumn: 'pvalue' });
    });
  });

  describe('getChangePointSeriesColumns', () => {
    it('returns value and time columns for a simple pipeline', () => {
      expect(
        getChangePointSeriesColumns(
          'FROM a | STATS c = COUNT(*) BY b | CHANGE_POINT c ON b AS t, pv'
        )
      ).toEqual({ valueColumn: 'c', timeColumn: 'b' });
    });

    it('defaults time column to @timestamp when ON is omitted', () => {
      expect(getChangePointSeriesColumns('FROM a | CHANGE_POINT value')).toEqual({
        valueColumn: 'value',
        timeColumn: '@timestamp',
      });
    });

    it('reads first CHANGE_POINT inside FORK', () => {
      const forkQuery = `FROM gallery-*
| FORK
  ( WHERE referer == "http://a.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket )
| WHERE type IS NOT NULL`;
      expect(getChangePointSeriesColumns(forkQuery)).toEqual({
        valueColumn: 'avg_bytes',
        timeColumn: 'bucket',
      });
    });
  });

  describe('buildChangePointLineDataQuery', () => {
    it('returns pipeline before top-level CHANGE_POINT', () => {
      const q =
        'FROM gallery-* | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket';
      expect(buildChangePointLineDataQuery(q)).toBe(
        'FROM gallery-* | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day)'
      );
    });

    it('strips trailing SORT before CHANGE_POINT', () => {
      const q = 'FROM i | STATS m = AVG(x) BY t | SORT t | CHANGE_POINT m ON t';
      expect(buildChangePointLineDataQuery(q)).toBe('FROM i | STATS m = AVG(x) BY t');
    });

    it('uses FORK branch 0 by default', () => {
      const forkQuery = `FROM gallery-*
| FORK
  ( WHERE referer == "http://a.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | SORT bucket | CHANGE_POINT avg_bytes ON bucket )
  ( WHERE referer == "http://b.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket )
| WHERE type IS NOT NULL`;
      const line = buildChangePointLineDataQuery(forkQuery);
      expect(line).toContain('FROM gallery-*');
      expect(line).toContain('WHERE referer == "http://a.com"');
      expect(line).not.toContain('CHANGE_POINT');
      expect(line).not.toContain('SORT bucket');
    });

    it('excludes commands after FORK (e.g. filter on change-point output)', () => {
      const forkQuery = `FROM gallery-*
| FORK
  ( WHERE referer == "http://a.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket )
| WHERE type IS NOT NULL`;
      const line = buildChangePointLineDataQuery(forkQuery);
      expect(line).toContain('FROM gallery-*');
      expect(line).not.toContain('type IS NOT NULL');
      expect(line).not.toContain('CHANGE_POINT');
    });

    it('preserves commands between source and FORK', () => {
      const forkQuery = `FROM gallery-*
| EVAL prep = 1
| FORK
  ( WHERE referer == "http://a.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket )
  ( WHERE referer == "http://b.com" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket )`;
      const line0 = buildChangePointLineDataQuery(forkQuery, { forkBranchIndex: 0 });
      const line1 = buildChangePointLineDataQuery(forkQuery, { forkBranchIndex: 1 });
      expect(line0).toContain('EVAL prep = 1');
      expect(line0).toContain('http://a.com');
      expect(line1).toContain('EVAL prep = 1');
      expect(line1).toContain('http://b.com');
    });
  });

  describe('appendEntityFiltersToChangePointLineEsql', () => {
    describe('formatEsqlIdentifier', () => {
      it('leaves simple identifiers unquoted', () => {
        expect(formatEsqlIdentifier('host')).toBe('host');
      });

      it('backticks identifiers with dots', () => {
        expect(formatEsqlIdentifier('k8s.pod.name')).toBe('`k8s.pod.name`');
      });

      it('escapes backticks in identifiers', () => {
        expect(formatEsqlIdentifier('weird`id')).toBe('`weird``id`');
      });
    });

    describe('formatEsqlLiteral', () => {
      it('formats empty string as an empty ES|QL string literal', () => {
        expect(formatEsqlLiteral('')).toBe('""');
      });

      it('quotes strings', () => {
        expect(formatEsqlLiteral('a"b')).toBe('"a\\"b"');
      });

      it('formats finite numbers', () => {
        expect(formatEsqlLiteral(3.5)).toBe('3.5');
      });

      it('formats booleans', () => {
        expect(formatEsqlLiteral(false)).toBe('false');
      });

      it('formats Date as ISO string literal', () => {
        const d = new Date('2023-11-14T22:13:20.000Z');
        expect(formatEsqlLiteral(d)).toBe('"2023-11-14T22:13:20.000Z"');
      });
    });

    describe('appendEntityFiltersToChangePointLineEsql behavior', () => {
      it('returns the query unchanged when there are no entity columns', () => {
        const q = 'FROM idx | STATS m = AVG(x) BY t';
        expect(appendEntityFiltersToChangePointLineEsql(q, { host: 'a' }, [])).toBe(q);
      });

      it('appends WHERE for entity columns', () => {
        const q = 'FROM idx | STATS m = AVG(x) BY host, t';
        expect(appendEntityFiltersToChangePointLineEsql(q, { host: 'pod-a' }, ['host'])).toBe(
          'FROM idx | STATS m = AVG(x) BY host, t | WHERE host == "pod-a"'
        );
      });

      it('combines multiple predicates with AND', () => {
        const q = 'FROM idx | STATS m = AVG(x) BY a, b, t';
        expect(appendEntityFiltersToChangePointLineEsql(q, { a: 1, b: 'x' }, ['a', 'b'])).toBe(
          'FROM idx | STATS m = AVG(x) BY a, b, t | WHERE a == 1 AND b == "x"'
        );
      });

      it('skips columns with no literal (null / undefined)', () => {
        const q = 'FROM idx | STATS m = AVG(x) BY host, t';
        expect(
          appendEntityFiltersToChangePointLineEsql(q, { host: null, other: 'ok' }, [
            'host',
            'other',
          ])
        ).toBe('FROM idx | STATS m = AVG(x) BY host, t | WHERE other == "ok"');
      });

      it('appends WHERE for entity columns with empty string values', () => {
        // Regression: formatEsqlLiteral("") previously returned undefined, silently dropping the
        // filter. Empty strings are valid ES|QL literals and must produce host == "".
        const q = 'FROM idx | STATS m = AVG(x) BY host, t';
        expect(
          appendEntityFiltersToChangePointLineEsql(q, { host: '', other: 'ok' }, ['host', 'other'])
        ).toBe('FROM idx | STATS m = AVG(x) BY host, t | WHERE host == "" AND other == "ok"');
      });

      it('does not duplicate WHERE when pipeline already constrains the entity via WHERE', () => {
        const line =
          'FROM gallery-* | WHERE clientip == "5.255.253.75" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day)';
        expect(
          appendEntityFiltersToChangePointLineEsql(line, { clientip: '5.255.253.75' }, ['clientip'])
        ).toBe(line);
      });

      it('does not duplicate WHERE when EVAL already sets the entity column to the same literal', () => {
        const line =
          'FROM gallery-* | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | EVAL clientip = "5.255.253.75"';
        expect(
          appendEntityFiltersToChangePointLineEsql(line, { clientip: '5.255.253.75' }, ['clientip'])
        ).toBe(line);
      });

      it('still appends filters for entity columns not already constrained in the pipeline', () => {
        const line =
          'FROM gallery-* | WHERE clientip == "5.255.253.75" | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day)';
        expect(
          appendEntityFiltersToChangePointLineEsql(
            line,
            { clientip: '5.255.253.75', region: 'us' },
            ['clientip', 'region']
          )
        ).toBe(`${line} | WHERE region == "us"`);
      });
    });
  });

  describe('hasInfoCommand', () => {
    it('should return true when query contains METRICS_INFO command', () => {
      expect(hasTimeseriesInfoCommand('TS index | METRICS_INFO')).toBe(true);
    });

    it('should return true when query contains TS_INFO command', () => {
      expect(hasTimeseriesInfoCommand('TS index | TS_INFO')).toBe(true);
    });

    it('should return true when METRICS_INFO appears with other commands', () => {
      expect(hasTimeseriesInfoCommand('TS index | METRICS_INFO | LIMIT 10')).toBe(true);
    });

    it('should return true when TS_INFO appears with other commands', () => {
      expect(hasTimeseriesInfoCommand('TS index | TS_INFO | LIMIT 10')).toBe(true);
    });

    it('should return false when query does not contain METRICS_INFO or TS_INFO', () => {
      expect(hasTimeseriesInfoCommand('FROM index | STATS count()')).toBe(false);
    });
  });
});
