/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type { ESQLColumnData } from '../types';
import { columnsAfter } from './columns_after';

describe('JOIN columnsAfter', () => {
  it('returns previousColumns when no join columns', async () => {
    const previousColumns: ESQLColumnData[] = [
      { name: 'fieldA', type: 'keyword', userDefined: false },
      { name: 'fieldB', type: 'long', userDefined: false },
    ];

    const result = await columnsAfter({} as any, previousColumns, '', {
      fromJoin: () => Promise.resolve([]),
      fromEnrich: () => Promise.resolve([]),
      fromFrom: () => Promise.resolve([]),
    });

    expect(result).toEqual(previousColumns);
  });

  it('prepends joinColumns to previousColumns when joinColumns is provided', async () => {
    const previousColumns: ESQLColumnData[] = [
      { name: 'fieldA', type: 'keyword', userDefined: false },
      { name: 'fieldB', type: 'long', userDefined: false },
    ];
    const joinColumns: ESQLFieldWithMetadata[] = [
      { name: 'joinField1', type: 'keyword', userDefined: false },
      { name: 'joinField2', type: 'double', userDefined: false },
    ];

    const result = await columnsAfter({} as any, previousColumns, '', {
      fromJoin: () => Promise.resolve(joinColumns),
      fromEnrich: () => Promise.resolve([]),
      fromFrom: () => Promise.resolve([]),
    });

    expect(result).toEqual([...joinColumns, ...previousColumns]);
  });

  it('overwrites previous columns with the same name', async () => {
    const previousColumns: ESQLColumnData[] = [
      { name: 'fieldA', type: 'keyword', userDefined: false },
      { name: 'fieldB', type: 'long', userDefined: false },
    ];
    const joinColumns: ESQLFieldWithMetadata[] = [
      { name: 'fieldA', type: 'text', userDefined: false },
      { name: 'fieldC', type: 'double', userDefined: false },
    ];

    const result = await columnsAfter({} as any, previousColumns, '', {
      fromJoin: () => Promise.resolve(joinColumns),
      fromEnrich: () => Promise.resolve([]),
      fromFrom: () => Promise.resolve([]),
    });

    expect(result).toEqual([
      { name: 'fieldA', type: 'text', userDefined: false },
      { name: 'fieldC', type: 'double', userDefined: false },
      { name: 'fieldB', type: 'long', userDefined: false },
    ]);
  });
});
