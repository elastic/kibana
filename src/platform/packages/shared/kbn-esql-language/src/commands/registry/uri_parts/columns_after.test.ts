/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '@elastic/esql';
import type { ESQLColumnData } from '../types';
import { columnsAfter, URI_PARTS_COLUMNS } from './columns_after';

describe('URI_PARTS > columnsAfter', () => {
  const previousColumns: ESQLColumnData[] = [
    { name: 'url', type: 'keyword', userDefined: false },
    { name: 'message', type: 'text', userDefined: false },
  ];
  const command = synth.cmd`URI_PARTS parts = url`;

  it('adds 10 prefixed columns from URI_PARTS', () => {
    const result = columnsAfter(command, previousColumns);

    expect(result).toHaveLength(previousColumns.length + URI_PARTS_COLUMNS.length);

    const newColumns = result.slice(previousColumns.length);
    expect(newColumns).toEqual(
      URI_PARTS_COLUMNS.map(({ suffix, type }) => ({
        name: `parts.${suffix}`,
        type,
        userDefined: false,
      }))
    );
  });

  it('preserves previous columns', () => {
    const result = columnsAfter(command, previousColumns);

    expect(result.slice(0, 2)).toEqual(previousColumns);
  });
});
