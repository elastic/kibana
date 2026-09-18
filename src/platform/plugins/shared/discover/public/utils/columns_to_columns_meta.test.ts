/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { Column } from '@kbn/data-source';
import { columnsToColumnsMeta } from './columns_to_columns_meta';

describe('columnsToColumnsMeta', () => {
  it('marks index columns as not computed and esql-result columns as computed', () => {
    const columns: Column[] = [
      {
        name: 'message',
        type: KBN_FIELD_TYPES.STRING,
        esType: 'keyword',
        source: 'index',
      },
      {
        name: 'avg_bytes',
        type: KBN_FIELD_TYPES.NUMBER,
        esType: 'double',
        source: 'esql-result',
      },
      {
        name: 'host',
        type: KBN_FIELD_TYPES.STRING,
        source: 'index',
      },
    ];

    expect(columnsToColumnsMeta(columns)).toEqual({
      message: { type: 'string', esType: 'keyword', isComputedColumn: false },
      avg_bytes: { type: 'number', esType: 'double', isComputedColumn: true },
      host: { type: 'string', isComputedColumn: false },
    });
  });
});
