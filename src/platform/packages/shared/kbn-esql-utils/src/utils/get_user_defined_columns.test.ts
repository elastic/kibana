/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getUserDefinedColumns,
  getAllUserDefinedColumnNames,
  isUserDefinedColumn,
} from './get_user_defined_columns';

describe('getUserDefinedColumns', () => {
  it('handles query with only source command', () => {
    const query = 'FROM logs*';
    const result = getUserDefinedColumns(query);

    expect(result).toEqual({});
  });
  describe('EVAL command', () => {
    it('identifies user-defined columns from EVAL command', () => {
      const query = 'FROM logs* | EVAL col = ABS(x)';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({
        1: ['col'],
      });
    });

    it('identifies automatically created columns columns from EVAL command', () => {
      const query = 'FROM logs* | EVAL ABS(x)';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({
        1: ['ABS(x)'],
      });
    });

    it('identifies multiple user-defined columns from EVAL command', () => {
      const query = 'FROM logs* | EVAL col1 = ABS(x), col2 = SQRT(y)';
      const result = getUserDefinedColumns(query);

      expect(result[1]).toHaveLength(2);
      expect(result[1]).toEqual(['col1', 'col2']);
    });
  });

  describe('RENAME command', () => {
    it('identifies user-defined columns from RENAME command with AS keyword', () => {
      const query = 'FROM logs* | RENAME AvgTicketPrice AS col';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({
        1: ['col'],
      });
    });

    it('identifies user-defined columns from RENAME command with name assignment', () => {
      const query = 'FROM logs* | RENAME col = AvgTicketPrice';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({
        1: ['col'],
      });
    });

    it('identifies multiple renames in a single command', () => {
      const query = 'FROM logs* | RENAME field1 AS newField1, field2 AS newField2';
      const result = getUserDefinedColumns(query);

      expect(result[1]).toHaveLength(2);
      expect(result[1]).toEqual(['newField1', 'newField2']);
    });
  });

  describe('STATS command', () => {
    it('identifies user-defined columns from STATS command', () => {
      const query = 'FROM logs* | STATS count = count() BY host.name';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({
        1: ['count'],
      });
    });

    it('identifies automatically created columns from STATS command', () => {
      const query = 'FROM logs* | STATS count() BY host.name';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({
        1: ['count()'],
      });
    });

    it('identifies user-defined columns from STATS BY option', () => {
      const query = 'FROM logs* | STATS count = count() BY col = host.name';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({
        1: ['count', 'col'],
      });
    });

    it('identifies multiple aggregations in STATS command', () => {
      const query =
        'FROM logs* | STATS count = count(), avg_price = avg(price), max_date = max(@timestamp) BY category';
      const result = getUserDefinedColumns(query);

      expect(result[1]).toHaveLength(3);
      expect(result[1]).toEqual(['count', 'avg_price', 'max_date']);
    });

    it('identifies multiple automatically created aggregations in STATS command', () => {
      const query = 'FROM logs* | STATS count(), avg(price), max(@timestamp) BY category';
      const result = getUserDefinedColumns(query);

      expect(result[1]).toHaveLength(3);
      expect(result[1]).toEqual(['count()', 'avg(price)', 'max(@timestamp)']);
    });
  });

  describe('Multiple commands', () => {
    it('identifies user-defined columns across multiple commands', () => {
      const query =
        'FROM logs* | EVAL computed = x * 2 | RENAME computed AS final_value | STATS max_val = max(final_value)';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({
        1: ['computed'],
        2: ['final_value'],
        3: ['max_val'],
      });
    });
  });
});

describe('getAllUserDefinedColumnNames', () => {
  it('returns flattened list of all user-defined column names', () => {
    const query =
      'FROM logs* | EVAL col1 = ABS(x) | RENAME col1 AS renamed_col | STATS count = count()';
    const result = getAllUserDefinedColumnNames(query);

    expect(result).toEqual(expect.arrayContaining(['col1', 'renamed_col', 'count']));
    expect(result).toHaveLength(3);
  });

  it('removes duplicate column names', () => {
    const query = 'FROM logs* | EVAL temp = 1 | EVAL temp = 2';
    const result = getAllUserDefinedColumnNames(query);

    expect(result).toEqual(['temp']);
    expect(result).toHaveLength(1);
  });

  it('returns empty array for queries without user-defined columns', () => {
    const query = 'FROM logs* | WHERE x > 0';
    const result = getAllUserDefinedColumnNames(query);

    expect(result).toEqual([]);
  });
});

describe('isUserDefinedColumn', () => {
  it('returns true for user-defined columns', () => {
    const query = 'FROM logs* | EVAL computed = ABS(x) | RENAME original AS renamed';

    expect(isUserDefinedColumn(query, 'computed')).toBe(true);
    expect(isUserDefinedColumn(query, 'renamed')).toBe(true);
  });

  it('returns false for non-user-defined columns', () => {
    const query = 'FROM logs* | EVAL computed = ABS(x) | RENAME original AS renamed';

    expect(isUserDefinedColumn(query, 'original')).toBe(false);
    expect(isUserDefinedColumn(query, 'x')).toBe(false);
    expect(isUserDefinedColumn(query, 'nonexistent')).toBe(false);
  });
});
