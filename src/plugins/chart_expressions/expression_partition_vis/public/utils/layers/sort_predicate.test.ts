/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '@kbn/expressions-plugin/common';
import { extractUniqTermsMap, sortPredicateByType } from './sort_predicate';
import { ChartTypes, PartitionVisParams } from '../../../common/types';
import { ArrayEntry } from '@elastic/charts';

describe('#extractUniqTermsMap', () => {
  it('should extract map', () => {
    const table: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'a', name: 'A', meta: { type: 'string' } },
        { id: 'b', name: 'B', meta: { type: 'string' } },
        { id: 'c', name: 'C', meta: { type: 'number' } },
      ],
      rows: [
        { a: 'Hi', b: 'Two', c: 2 },
        { a: 'Test', b: 'Two', c: 5 },
        { a: 'Foo', b: 'Three', c: 6 },
      ],
    };
    expect(extractUniqTermsMap(table, 'a')).toMatchInlineSnapshot(`
      Object {
        "Foo": 2,
        "Hi": 0,
        "Test": 1,
      }
    `);
    expect(extractUniqTermsMap(table, 'b')).toMatchInlineSnapshot(`
      Object {
        "Three": 1,
        "Two": 0,
      }
    `);
  });
});

describe('#sortPredicateByType', () => {
  function getSortPredicate(chartType: ChartTypes) {
    const table: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'a', name: 'A', meta: { type: 'string' } },
        { id: 'b', name: 'B', meta: { type: 'string' } },
        { id: 'c', name: 'C', meta: { type: 'number' } },
      ],
      rows: [
        { a: 'Hi', b: 'Two', c: 2 },
        { a: 'Test', b: 'Two', c: 5 },
        { a: 'Foo', b: 'Three', c: 6 },
      ],
    };
    return sortPredicateByType(
      chartType,
      {
        respectSourceOrder: true,
      } as PartitionVisParams,
      table,
      table.columns
    );
  }
  it('should correct sort items for PIE and DONUT chart types', () => {
    const sortPredicate = getSortPredicate(ChartTypes.PIE);
    // if we have inputIndex's, uses them as sort order
    let items = [
      ['test3', { inputIndex: [3], value: 2 }],
      ['test1', { inputIndex: [1], value: 4 }],
      ['test2', { inputIndex: [2], value: 1 }],
      ['test1', { inputIndex: [1], value: 3 }],
      ['test3', { inputIndex: [3], value: 8 }],
      ['test2', { inputIndex: [2], value: 9 }],
    ] as ArrayEntry[];
    expect(items.sort(sortPredicate)).toEqual([
      ['test1', { inputIndex: [1], value: 4 }],
      ['test1', { inputIndex: [1], value: 3 }],
      ['test2', { inputIndex: [2], value: 1 }],
      ['test2', { inputIndex: [2], value: 9 }],
      ['test3', { inputIndex: [3], value: 2 }],
      ['test3', { inputIndex: [3], value: 8 }],
    ]);

    // if we don't have inputIndex's, uses value for sorting
    items = [
      ['test3', { value: 2 }],
      ['test1', { value: 4 }],
      ['test2', { value: 1 }],
      ['test1', { value: 3 }],
      ['test3', { value: 8 }],
      ['test2', { value: 9 }],
    ] as ArrayEntry[];
    expect(items.sort(sortPredicate)).toEqual([
      ['test2', { inputIndex: undefined, value: 9 }],
      ['test3', { inputIndex: undefined, value: 8 }],
      ['test1', { inputIndex: undefined, value: 4 }],
      ['test1', { inputIndex: undefined, value: 3 }],
      ['test3', { inputIndex: undefined, value: 2 }],
      ['test2', { inputIndex: undefined, value: 1 }],
    ]);
  });

  it('should correct sort items for MOSAIC chart type', () => {
    const sortPredicate = getSortPredicate(ChartTypes.MOSAIC);
    // if sortingMap includes name's, use sortingMap for sorting order
    let items = [
      ['Foo', { value: 2, children: [['test', { value: 1 }]] }],
      ['Hi', { value: 4, children: [['test', { value: 1 }]] }],
      ['Test', { value: 1, children: [['test', { value: 1 }]] }],
    ] as ArrayEntry[];
    expect(items.sort(sortPredicate)).toEqual([
      ['Hi', { value: 4, children: [['test', { value: 1 }]] }],
      ['Test', { value: 1, children: [['test', { value: 1 }]] }],
      ['Foo', { value: 2, children: [['test', { value: 1 }]] }],
    ]);

    // if sortingMap doesn't include name's, uses value for sorting
    const children: ArrayEntry[] = [];
    items = [
      ['test', { value: 2, children }],
      ['test1', { value: 4, children }],
      ['test2', { value: 1, children }],
    ] as ArrayEntry[];
    expect(items.sort(sortPredicate)).toEqual([
      ['test1', { value: 4, children }],
      ['test', { value: 2, children }],
      ['test2', { value: 1, children }],
    ]);
  });

  it('should correct sort items for WAFFLE chart type', () => {
    const sortPredicate = getSortPredicate(ChartTypes.WAFFLE);

    const items = [
      ['Foo', { value: 2 }],
      ['Hi', { value: 4 }],
      ['Test', { value: 1 }],
    ] as ArrayEntry[];
    expect(items.sort(sortPredicate)).toEqual([
      ['Hi', { value: 4 }],
      ['Foo', { value: 2 }],
      ['Test', { value: 1 }],
    ]);
  });
});
