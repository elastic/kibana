/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  computeInsertionText,
  computeRemovalRange,
  findFirstCommandPosition,
  findNextNonWhitespaceChar,
  findPrevNonWhitespaceChar,
  getLocatedSourceItemsFromQuery,
} from './utils';

describe('findFirstCommandPosition', () => {
  describe('FROM command', () => {
    it('should find FROM command at the beginning of a line', () => {
      const query = 'FROM index_name';
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 1, startColumn: 1 });
    });

    it('should find FROM command in the middle of a line', () => {
      const query = 'SELECT * FROM index_name WHERE field = value';
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 1, startColumn: 10 });
    });

    it('should find multiple FROM commands in a single line', () => {
      const query = 'FROM index1, FROM index2';
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 1, startColumn: 1 });
    });

    it('should find FROM commands across multiple lines', () => {
      const query = `FROM index1
WHERE field = value
FROM index2`;
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 1, startColumn: 1 });
    });

    it('should be case insensitive', () => {
      const query = 'from index_name';
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 1, startColumn: 1 });
    });

    it('should not match FROM as part of another word', () => {
      const query = 'FROM index_name PERFORM action';
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 1, startColumn: 1 });
    });

    it('should handle FROM at the end of a line', () => {
      const query = 'SELECT * FROM';
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 1, startColumn: 10 });
    });

    it('should handle FROM followed by newline', () => {
      const query = 'FROM\nindex_name';
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 1, startColumn: 1 });
    });
  });

  describe('TS command', () => {
    it('should find TS command at the beginning of a line', () => {
      const query = 'TS 2023-01-01';
      const position = findFirstCommandPosition(query, 'TS');
      expect(position).toEqual({ lineNumber: 1, startColumn: 1 });
    });

    it('should find TS command in the middle of a line', () => {
      const query = 'FROM index_name TS 2023-01-01';
      const position = findFirstCommandPosition(query, 'TS');
      expect(position).toEqual({ lineNumber: 1, startColumn: 17 });
    });

    it('should not match "ts" as part of another word like "?_tstart"', () => {
      const query = 'WHERE field >= ?_tstart';
      const position = findFirstCommandPosition(query, 'TS');
      expect(position).toBeUndefined();
    });

    it('should find multiple TS commands', () => {
      const query = 'TS 2023-01-01 AND TS 2023-12-31';
      const position = findFirstCommandPosition(query, 'TS');
      expect(position).toEqual({ lineNumber: 1, startColumn: 1 });
    });

    it('should be case insensitive for TS', () => {
      const query = 'ts 2023-01-01';
      const position = findFirstCommandPosition(query, 'TS');
      expect(position).toEqual({ lineNumber: 1, startColumn: 1 });
    });
  });

  describe('edge cases', () => {
    it('should return empty array for empty query', () => {
      const position = findFirstCommandPosition('', 'FROM');
      expect(position).toBeUndefined();
    });

    it('should return empty array when command is not found', () => {
      const query = 'SELECT * FROM index_name';
      const position = findFirstCommandPosition(query, 'TS');
      expect(position).toBeUndefined();
    });

    it('should handle query with only whitespace', () => {
      const query = ' \n \n ';
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toBeUndefined();
    });

    it('should handle command with spaces around it', () => {
      const query = ' FROM index_name ';
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 1, startColumn: 2 });
    });

    it('should handle command at the very beginning with no space after', () => {
      const query = 'FROMindex_name';
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toBeUndefined();
    });

    it('should handle multiple lines with empty lines', () => {
      const query = `FROM index1

FROM index2`;
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 1, startColumn: 1 });
    });

    it('should handle command on a line by itself', () => {
      const query = `SELECT *
FROM
index_name`;
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 2, startColumn: 1 });
    });
  });

  describe('real-world query examples', () => {
    it('should handle a complete ESQL query with FROM', () => {
      const query = `FROM logs-*
| WHERE @timestamp >= NOW() - 1h
| STATS count() BY host`;
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 1, startColumn: 1 });
    });

    it('should handle a query with TS command', () => {
      const query = `FROM logs-*
TS 2023-01-01 TO 2023-12-31
| WHERE status = 200`;
      const position = findFirstCommandPosition(query, 'TS');
      expect(position).toEqual({ lineNumber: 2, startColumn: 1 });
    });

    it('should return only the first FROM command', () => {
      const query = `FROM index1, (FROM index2
| WHERE a > 10
| EVAL b = a * 2
| STATS cnt = COUNT(*) BY c
| SORT cnt desc
| LIMIT 10), index3
| WHERE d > 10`;
      const position = findFirstCommandPosition(query, 'FROM');
      expect(position).toEqual({ lineNumber: 1, startColumn: 1 });
    });
  });
});

describe('findPrevNonWhitespaceChar / findNextNonWhitespaceChar', () => {
  const text = 'a  ,  b';

  it('should find previous non-whitespace character', () => {
    // Cursor between the two spaces before comma
    const from = text.indexOf(',') - 1; // points at the space right before comma
    expect(findPrevNonWhitespaceChar(text, from, 0)).toBe('a');
  });

  it('should find next non-whitespace character', () => {
    // Cursor right after comma
    const from = text.indexOf(',') + 1; // points at the space right after comma
    expect(findNextNonWhitespaceChar(text, from, text.length)).toBe('b');
  });
});

describe('computeInsertionText', () => {
  it('badge mode should insert at beginning and add trailing comma when there are existing sources', () => {
    const query = 'FROM index1,   index2';
    const index1Start = query.indexOf('index1');
    const index2Start = query.indexOf('index2');
    const items = [
      { min: index1Start, max: index1Start + 'index1'.length - 1 },
      { min: index2Start, max: index2Start + 'index2'.length - 1 },
    ];

    expect(
      computeInsertionText({
        query,
        items,
        at: index1Start, // ignored for badge insertion when items exist
        sourceName: 'index4',
        mode: 'badge',
      })
    ).toEqual({ at: index1Start, text: 'index4,' });
  });

  it('badge mode should insert only the source when list is empty', () => {
    const query = 'FROM |';
    expect(
      computeInsertionText({
        query,
        items: [],
        at: query.length,
        sourceName: 'index4',
        mode: 'badge',
      })
    ).toEqual({ at: query.length, text: 'index4' });
  });

  it('autocomplete mode should insert at cursor and add trailing comma when inserting before another source', () => {
    const query = 'FROM index1,   index2';
    const index1Start = query.indexOf('index1');
    const index2Start = query.indexOf('index2');
    const items = [
      { min: index1Start, max: index1Start + 'index1'.length - 1 },
      { min: index2Start, max: index2Start + 'index2'.length - 1 },
    ];

    // Cursor between comma+spaces and next source
    const at = query.indexOf('index2') - 1; // in the whitespace before index2
    expect(
      computeInsertionText({
        query,
        items,
        at,
        sourceName: 'index4',
        mode: 'autocomplete',
      })
    ).toEqual({ at, text: 'index4,' });
  });

  it('autocomplete mode should insert at cursor and add leading comma when inserting after the last source', () => {
    const query = 'FROM index1, index2    |';
    const index1Start = query.indexOf('index1');
    const index2Start = query.indexOf('index2');
    const items = [
      { min: index1Start, max: index1Start + 'index1'.length - 1 },
      { min: index2Start, max: index2Start + 'index2'.length - 1 },
    ];

    // Cursor in the trailing spaces after index2
    const at = query.indexOf('|') - 1;
    expect(
      computeInsertionText({
        query,
        items,
        at,
        sourceName: 'index4',
        mode: 'autocomplete',
      })
    ).toEqual({ at, text: ',index4' });
  });
});

describe('computeRemovalRange', () => {
  it('should remove middle source plus following comma when possible', () => {
    const query = 'FROM index1,   index2  ,index3';
    const index1Start = query.indexOf('index1');
    const index2Start = query.indexOf('index2');
    const index3Start = query.indexOf('index3');

    const items = [
      {
        type: 'source',
        name: 'index1',
        min: index1Start,
        max: index1Start + 'index1'.length - 1,
      },
      {
        type: 'source',
        name: 'index2',
        min: index2Start,
        max: index2Start + 'index2'.length - 1,
      },
      {
        type: 'source',
        name: 'index3',
        min: index3Start,
        max: index3Start + 'index3'.length - 1,
      },
    ];

    const range = computeRemovalRange(query, items, 'index2');
    expect(range).toBeDefined();
    expect(query.slice(range!.start, range!.end)).toBe('index2  ,');
  });

  it('should remove end source with preceding comma when possible', () => {
    const query = 'FROM index1, index2,index3';
    const index1Start = query.indexOf('index1');
    const index2Start = query.indexOf('index2');
    const index3Start = query.indexOf('index3');

    const items = [
      { type: 'source', name: 'index1', min: index1Start, max: index1Start + 5 },
      { type: 'source', name: 'index2', min: index2Start, max: index2Start + 5 },
      { type: 'source', name: 'index3', min: index3Start, max: index3Start + 5 },
    ];

    const range = computeRemovalRange(query, items, 'index3');
    expect(range).toBeDefined();
    expect(query.slice(range!.start, range!.end)).toBe(',index3');
  });
});

describe('getLocatedSourceItemsFromQuery', () => {
  it('should locate source items for a FROM query', () => {
    const query = 'FROM index1,   index2 | WHERE a > 10';
    const items = getLocatedSourceItemsFromQuery(query);

    expect(items.map((i) => i.name)).toEqual(['index1', 'index2']);
    // sanity check: offsets point at the tokens in the original query
    expect(query.slice(items[0].min, items[0].max + 1)).toBe('index1');
    expect(query.slice(items[1].min, items[1].max + 1)).toBe('index2');
  });
});
