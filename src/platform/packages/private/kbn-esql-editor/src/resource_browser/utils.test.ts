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
  findNextNonWhitespaceChar,
  findPrevNonWhitespaceChar,
  getLocatedSourceItemsFromQuery,
  getQueryWithoutLastPipe,
  getSourceCommandContextFromQuery,
} from './utils';
import { IndicesBrowserOpenMode } from './types';

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

  it('autocomplete mode should add trailing comma when a subquery follows the sources list', () => {
    const query =
      'FROM kibana_sample_data_ecommerce, (FROM kibana_sample_data_ecommerce | LIMIT 1)';
    const idxStart = query.indexOf('kibana_sample_data_ecommerce');
    const items = [
      {
        min: idxStart,
        max: idxStart + 'kibana_sample_data_ecommerce'.length - 1,
      },
    ];

    // Cursor right after the comma separating main source and subquery
    const at = query.indexOf(',') + 1;
    expect(
      computeInsertionText({
        query,
        items,
        at,
        sourceName: 'kibana_sample_data_logs',
        mode: 'autocomplete',
      })
    ).toEqual({ at, text: 'kibana_sample_data_logs,' });
  });

  it('autocomplete mode should insert a source before a subquery when there are no existing sources', () => {
    const query = 'FROM (FROM kibana_sample_data_ecommerce | LIMIT 1)';
    const at = query.indexOf('FROM') + 4; // right after `FROM`

    expect(
      computeInsertionText({
        query,
        items: [],
        at,
        sourceName: 'kibana_sample_data_ecommerce',
        mode: 'autocomplete',
      })
    ).toEqual({ at, text: ' kibana_sample_data_ecommerce,' });
  });

  it('autocomplete mode should not add trailing comma before FROM metadata clause', () => {
    const query = 'FROM index1 metadata _id';
    const index1Start = query.indexOf('index1');
    const items = [{ min: index1Start, max: index1Start + 'index1'.length - 1 }];

    const at = query.indexOf('metadata') - 1; // in the whitespace before metadata
    expect(
      computeInsertionText({
        query,
        items,
        at,
        sourceName: 'index2',
        mode: 'autocomplete',
      })
    ).toEqual({ at, text: ',index2' });
  });
});

describe('getSourceCommandContextFromQuery', () => {
  it('returns sources range and inserts at start when opened from badge', () => {
    const query = 'FROM index1,   index2 ,index3';
    const cursorOffset = query.indexOf('index2');

    const ctx = getSourceCommandContextFromQuery({
      queryText: query,
      cursorOffset,
      openedFrom: IndicesBrowserOpenMode.Badge,
    });

    expect(ctx.command).toBe('from');
    expect(ctx.sourcesStartOffset).toBe(query.indexOf('index1'));
    expect(ctx.sourcesEndOffset).toBe(query.indexOf('index3') + 'index3'.length);
    expect(ctx.insertionOffset).toBe(query.indexOf('index1'));
  });

  it('inserts at cursor when opened from autocomplete', () => {
    const query = 'FROM index1, index2';
    const cursorOffset = query.indexOf('index2');

    const ctx = getSourceCommandContextFromQuery({
      queryText: query,
      cursorOffset,
      openedFrom: IndicesBrowserOpenMode.Autocomplete,
    });

    expect(ctx.command).toBe('from');
    expect(ctx.insertionOffset).toBe(cursorOffset);
  });

  it('handles empty source list by returning insertionOffset only', () => {
    const query = 'FROM ';
    const cursorOffset = query.length;

    const ctx = getSourceCommandContextFromQuery({
      queryText: query,
      cursorOffset,
      openedFrom: IndicesBrowserOpenMode.Autocomplete,
    });

    expect(ctx.command).toBe('from');
    expect(ctx.sourcesStartOffset).toBeUndefined();
    expect(ctx.sourcesEndOffset).toBeUndefined();
    expect(ctx.insertionOffset).toBe(cursorOffset);
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

  it('should remove the only main source and the following comma when a subquery follows', () => {
    const query = 'FROM kibana_sample_data_logs, (FROM kibana_sample_data_ecommerce | LIMIT 1)';
    const idxStart = query.indexOf('kibana_sample_data_logs');
    const items = [
      {
        type: 'source',
        name: 'kibana_sample_data_logs',
        min: idxStart,
        max: idxStart + 'kibana_sample_data_logs'.length - 1,
      },
    ];

    const range = computeRemovalRange(query, items, 'kibana_sample_data_logs');
    expect(range).toBeDefined();
    expect(query.slice(range!.start, range!.end)).toBe('kibana_sample_data_logs,');
  });
});

describe('getQueryWithoutLastPipe', () => {
  it('strips the last pipe and trailing command', () => {
    expect(getQueryWithoutLastPipe('FROM kibana_sample_data_logs | STATS AVG(bytes) | KEEP')).toBe(
      'FROM kibana_sample_data_logs | STATS AVG(bytes)'
    );
  });

  it('returns full query when there is only one command', () => {
    const query = 'FROM index';
    expect(getQueryWithoutLastPipe(query)).toBe(query);
  });

  it('strips the last pipe when there are two commands (e.g. FROM ... | KEEP)', () => {
    expect(getQueryWithoutLastPipe('FROM kibana_sample_data_logs | KEEP')).toBe(
      'FROM kibana_sample_data_logs'
    );
  });

  it('returns query without last command when there are two commands', () => {
    expect(getQueryWithoutLastPipe('FROM a | STATS count(*)')).toBe('FROM a');
  });

  it('trims trailing whitespace and strips last command', () => {
    expect(getQueryWithoutLastPipe('FROM a | STATS x | KEEP  \n  ')).toBe('FROM a | STATS x');
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
