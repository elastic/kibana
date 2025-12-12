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
  describe('EVAL commands', () => {
    it('identifies user-defined columns from EVAL command', () => {
      const query = 'FROM logs* | EVAL col = ABS(x)';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({
        1: [
          {
            name: 'col',
          },
        ],
      });
    });

    it('identifies multiple user-defined columns from EVAL command', () => {
      const query = 'FROM logs* | EVAL col1 = ABS(x), col2 = SQRT(y)';
      const result = getUserDefinedColumns(query);

      expect(result[1]).toHaveLength(2);
      expect(result[1].map((c) => c.name)).toEqual(['col1', 'col2']);
    });
  });

  describe('RENAME commands', () => {
    it('identifies user-defined columns from RENAME command', () => {
      const query = 'FROM logs* | RENAME AvgTicketPrice AS ss';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({
        1: [
          {
            name: 'ss',
            originalName: 'AvgTicketPrice',
          },
        ],
      });
    });

    it('identifies multiple renames in a single command', () => {
      const query = 'FROM logs* | RENAME field1 AS newField1, field2 AS newField2';
      const result = getUserDefinedColumns(query);

      expect(result[1]).toHaveLength(2);
      expect(result[1].map((c) => c.name)).toEqual(['newField1', 'newField2']);
      expect(result[1].map((c) => c.originalName)).toEqual(['field1', 'field2']);
    });
  });

  describe('STATS commands', () => {
    it('identifies user-defined columns from STATS command', () => {
      const query = 'FROM logs* | STATS count = count() BY host.name';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({
        1: [
          {
            name: 'count',
          },
        ],
      });
    });

    it('identifies multiple aggregations in STATS command', () => {
      const query =
        'FROM logs* | STATS count = count(), avg_price = avg(price), max_date = max(@timestamp) BY category';
      const result = getUserDefinedColumns(query);

      expect(result[1]).toHaveLength(3);
      expect(result[1].map((c) => c.name)).toEqual(['count', 'avg_price', 'max_date']);
    });
  });

  describe('Multiple commands', () => {
    it('identifies user-defined columns across multiple commands', () => {
      const query =
        'FROM logs* | EVAL computed = x * 2 | RENAME computed AS final_value | STATS max_val = max(final_value)';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({
        1: [
          {
            name: 'computed',
          },
        ],
        2: [
          {
            name: 'final_value',
            originalName: 'computed',
          },
        ],
        3: [
          {
            name: 'max_val',
          },
        ],
      });
    });
  });

  describe('Complex queries', () => {
    it('handles queries without user-defined columns', () => {
      const query = 'FROM logs* | WHERE x > 0 | KEEP field1, field2 | SORT @timestamp';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({});
    });

    it('handles empty query', () => {
      const query = '';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({});
    });

    it('handles query with only source command', () => {
      const query = 'FROM logs*';
      const result = getUserDefinedColumns(query);

      expect(result).toEqual({});
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

  it('handles edge cases', () => {
    const query = '';

    expect(isUserDefinedColumn(query, 'any_column')).toBe(false);
  });
});
