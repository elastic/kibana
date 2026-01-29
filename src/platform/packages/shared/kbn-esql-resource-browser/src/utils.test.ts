/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { findCommandPositions } from './utils';

describe('findCommandPositions', () => {
  describe('FROM command', () => {
    it('should find FROM command at the beginning of a line', () => {
      const query = 'FROM index_name';
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([{ lineNumber: 1, startColumn: 1 }]);
    });

    it('should find FROM command in the middle of a line', () => {
      const query = 'SELECT * FROM index_name WHERE field = value';
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([{ lineNumber: 1, startColumn: 10 }]);
    });

    it('should find multiple FROM commands in a single line', () => {
      const query = 'FROM index1, FROM index2';
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([
        { lineNumber: 1, startColumn: 1 },
        { lineNumber: 1, startColumn: 14 },
      ]);
    });

    it('should find FROM commands across multiple lines', () => {
      const query = `FROM index1
WHERE field = value
FROM index2`;
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([
        { lineNumber: 1, startColumn: 1 },
        { lineNumber: 3, startColumn: 1 },
      ]);
    });

    it('should be case insensitive', () => {
      const query = 'from index_name';
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([{ lineNumber: 1, startColumn: 1 }]);
    });

    it('should not match FROM as part of another word', () => {
      const query = 'FROM index_name PERFORM action';
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([{ lineNumber: 1, startColumn: 1 }]);
    });

    it('should handle FROM at the end of a line', () => {
      const query = 'SELECT * FROM';
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([{ lineNumber: 1, startColumn: 10 }]);
    });

    it('should handle FROM followed by newline', () => {
      const query = 'FROM\nindex_name';
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([{ lineNumber: 1, startColumn: 1 }]);
    });
  });

  describe('TS command', () => {
    it('should find TS command at the beginning of a line', () => {
      const query = 'TS 2023-01-01';
      const positions = findCommandPositions(query, 'TS');
      expect(positions).toEqual([{ lineNumber: 1, startColumn: 1 }]);
    });

    it('should find TS command in the middle of a line', () => {
      const query = 'FROM index_name TS 2023-01-01';
      const positions = findCommandPositions(query, 'TS');
      expect(positions).toEqual([{ lineNumber: 1, startColumn: 17 }]);
    });

    it('should not match "ts" as part of another word like "?_tstart"', () => {
      const query = 'WHERE field >= ?_tstart';
      const positions = findCommandPositions(query, 'TS');
      expect(positions).toEqual([]);
    });

    it('should find multiple TS commands', () => {
      const query = 'TS 2023-01-01 AND TS 2023-12-31';
      const positions = findCommandPositions(query, 'TS');
      expect(positions).toEqual([
        { lineNumber: 1, startColumn: 1 },
        { lineNumber: 1, startColumn: 19 },
      ]);
    });

    it('should be case insensitive for TS', () => {
      const query = 'ts 2023-01-01';
      const positions = findCommandPositions(query, 'TS');
      expect(positions).toEqual([{ lineNumber: 1, startColumn: 1 }]);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for empty query', () => {
      const positions = findCommandPositions('', 'FROM');
      expect(positions).toEqual([]);
    });

    it('should return empty array when command is not found', () => {
      const query = 'SELECT * FROM index_name';
      const positions = findCommandPositions(query, 'TS');
      expect(positions).toEqual([]);
    });

    it('should handle query with only whitespace', () => {
      const query = '   \n  \n  ';
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([]);
    });

    it('should handle command with spaces around it', () => {
      const query = '  FROM  index_name  ';
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([{ lineNumber: 1, startColumn: 3 }]);
    });

    it('should handle command at the very beginning with no space after', () => {
      const query = 'FROMindex_name';
      const positions = findCommandPositions(query, 'FROM');
      // Should not match because there's no word boundary after FROM
      expect(positions).toEqual([]);
    });

    it('should handle multiple lines with empty lines', () => {
      const query = `FROM index1

FROM index2`;
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([
        { lineNumber: 1, startColumn: 1 },
        { lineNumber: 3, startColumn: 1 },
      ]);
    });

    it('should handle command on a line by itself', () => {
      const query = `SELECT *
FROM
index_name`;
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([{ lineNumber: 2, startColumn: 1 }]);
    });
  });

  describe('real-world query examples', () => {
    it('should handle a complete ESQL query with FROM', () => {
      const query = `FROM logs-*
| WHERE @timestamp >= NOW() - 1h
| STATS count() BY host`;
      const positions = findCommandPositions(query, 'FROM');
      expect(positions).toEqual([{ lineNumber: 1, startColumn: 1 }]);
    });

    it('should handle a query with TS command', () => {
      const query = `FROM logs-*
TS 2023-01-01 TO 2023-12-31
| WHERE status = 200`;
      const positions = findCommandPositions(query, 'TS');
      expect(positions).toEqual([{ lineNumber: 2, startColumn: 1 }]);
    });
  });
});
