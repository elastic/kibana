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
import type { ESQLColumnData, ESQLUserDefinedColumn } from '../../types';
import type { ESQLAstRerankCommand } from '../../../types';

describe('RERANK columnsAfter', () => {
  const previousColumns: ESQLColumnData[] = [
    { name: 'col1', type: 'keyword', userDefined: false },
    { name: 'col2', type: 'long', userDefined: false },
  ];

  it('should add a "_score" column if target field is not specified', () => {
    const command = cmd`RERANK "query" ON field` as ESQLAstRerankCommand;
    const result = columnsAfter(command, previousColumns);
    expect(result).toEqual([
      ...previousColumns,
      {
        name: '_score',
        type: 'keyword',
        userDefined: false,
      },
    ]);
  });

  it('should add a new column for the target field', () => {
    const command = cmd`RERANK rerankScore = "query" ON field` as ESQLAstRerankCommand;
    const result = columnsAfter(command, previousColumns);
    const newColumn = result.find((c) => c.name === 'rerankScore');

    expect(newColumn).toBeDefined();
    expect(newColumn?.type).toBe('keyword');
    expect(newColumn?.userDefined).toBe(true);
    expect((newColumn as ESQLUserDefinedColumn)?.location).toEqual(command.targetField?.location);
  });

  it('should not add a duplicate column if one already exists', () => {
    const command = cmd`RERANK col1 = "query" ON field` as ESQLAstRerankCommand;
    const result = columnsAfter(command, previousColumns);
    expect(result).toEqual(previousColumns);
    const col1 = result.find((c) => c.name === 'col1');
    expect(col1?.userDefined).toBe(false);
  });
});
