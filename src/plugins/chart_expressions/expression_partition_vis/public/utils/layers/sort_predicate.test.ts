/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '../../../../../expressions';
import { extractUniqTermsMap } from './sort_predicate';

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
