/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { cmd } from '../../../synth';
import { columnsAfter } from './columns_after';
import type { ESQLColumnData } from '../../types';

describe('RERANK columnsAfter', () => {
  const previousColumns: ESQLColumnData[] = [
    { name: 'col1', type: 'keyword', userDefined: false },
    { name: 'col2', type: 'long', userDefined: false },
  ];

  it('should add a new column for the target field', () => {
    const command = cmd`RERANK score = "query" ON field`;
    const result = columnsAfter(command, previousColumns, '');
    const newColumn = result.find((c) => c.name === 'score');

    expect(newColumn).toBeDefined();
    expect(newColumn?.type).toBe('double');
    expect(newColumn?.userDefined).toBe(true);
  });

  it('should not add a new column if target field is not specified', () => {
    const command = cmd`RERANK "query" ON field`;
    const result = columnsAfter(command, previousColumns, '');
    expect(result).toEqual(previousColumns);
  });

  it('should replace an existing column with the same name as the target field', () => {
    const command = cmd`RERANK col1 = "query" ON field`;
    const result = columnsAfter(command, previousColumns, '');
    const newColumn = result.find((c) => c.name === 'col1');

    expect(newColumn).toBeDefined();
    expect(newColumn?.type).toBe('double');
    expect(newColumn?.userDefined).toBe(true);

    const oldColumn = result.find((c) => c.name === 'col2');
    expect(oldColumn).toBeDefined();
  });
});
