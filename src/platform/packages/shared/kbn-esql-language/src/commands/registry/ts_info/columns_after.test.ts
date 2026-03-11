/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import { columnsAfter, TS_INFO_FIELDS } from './columns_after';

describe('TS_INFO > columnsAfter', () => {
  const mockCommand = { name: 'ts_info' } as ESQLCommand;

  it('appends TS_INFO columns to previous columns', () => {
    const previousColumns: ESQLColumnData[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(mockCommand, previousColumns, '');

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
      ...TS_INFO_FIELDS,
    ]);
  });

  it('returns only TS_INFO columns when previous columns is empty', () => {
    const result = columnsAfter(mockCommand, [], '');

    expect(result).toEqual(TS_INFO_FIELDS);
  });
});
