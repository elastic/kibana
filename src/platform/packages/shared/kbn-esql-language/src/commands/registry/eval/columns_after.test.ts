/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { additionalFieldsMock } from '../../../__tests__/language/helpers';
import { Parser, synth } from '../../../..';
import { UnmappedFieldsStrategy, type ESQLColumnData } from '../types';
import { columnsAfter } from './columns_after';

describe('EVAL > columnsAfter', () => {
  const baseColumns: ESQLColumnData[] = [
    { name: 'foo', type: 'integer', userDefined: false },
    { name: 'bar', type: 'keyword', userDefined: false },
  ];

  it('adds a new column for a simple assignment', () => {
    const command = synth.cmd`EVAL baz = foo + 1`;
    const result = columnsAfter(
      command,
      baseColumns,
      '',
      additionalFieldsMock,
      UnmappedFieldsStrategy.FAIL
    );

    expect(result).toEqual([
      {
        name: 'baz',
        type: 'integer',
        location: { min: 0, max: 0 },
        userDefined: true,
      },
      ...baseColumns,
    ]);
  });

  it('adds multiple new columns for multiple assignments', () => {
    const command = synth.cmd`EVAL baz = foo + 1, qux = bar`;
    const result = columnsAfter(
      command,
      baseColumns,
      '',
      additionalFieldsMock,
      UnmappedFieldsStrategy.FAIL
    );

    expect(result).toEqual([
      {
        name: 'baz',
        type: 'integer',
        location: { min: 0, max: 0 },
        userDefined: true,
      },
      {
        name: 'qux',
        type: 'keyword',
        location: { min: 0, max: 0 },
        userDefined: true,
      },
      ...baseColumns,
    ]);
  });

  it('adds a column for a single expression (not assignment)', () => {
    const queryString = `FROM index | EVAL foo + 1`;

    // Can't use synth because it steps on the location information
    // which is used to determine the name of the new column
    const {
      root: {
        commands: [, command],
      },
    } = Parser.parseQuery(queryString);

    const result = columnsAfter(
      command,
      baseColumns,
      queryString,
      additionalFieldsMock,
      UnmappedFieldsStrategy.FAIL
    );

    expect(result).toEqual([
      {
        name: 'foo + 1',
        type: 'integer',
        location: { min: 18, max: 24 },
        userDefined: true,
      },
      ...baseColumns,
    ]);
  });

  it('handles mix of assignments and expressions', () => {
    const queryString = `FROM index | EVAL baz = foo + 1, TRIM(bar)`;

    // Can't use synth because it steps on the location information
    // which is used to determine the name of the new column
    const {
      root: {
        commands: [, command],
      },
    } = Parser.parseQuery(queryString);

    const result = columnsAfter(
      command,
      baseColumns,
      queryString,
      additionalFieldsMock,
      UnmappedFieldsStrategy.FAIL
    );

    expect(result).toEqual([
      {
        name: 'baz',
        type: 'integer',
        location: { min: 18, max: 20 },
        userDefined: true,
      },
      {
        name: 'TRIM(bar)',
        type: 'keyword',
        location: { min: 33, max: 41 },
        userDefined: true,
      },
      ...baseColumns,
    ]);
  });

  it('returns previous columns if no args', () => {
    const command = { args: [] } as any;
    const result = columnsAfter(
      command,
      baseColumns,
      '',
      additionalFieldsMock,
      UnmappedFieldsStrategy.FAIL
    );

    expect(result).toEqual(baseColumns);
  });

  it('handles overwriting columns', () => {
    const command = synth.cmd`EVAL foo = "", bar = 23`;
    const result = columnsAfter(
      command,
      baseColumns,
      '',
      additionalFieldsMock,
      UnmappedFieldsStrategy.FAIL
    );

    expect(result).toEqual([
      {
        name: 'foo',
        type: 'keyword', // originally integer
        location: { min: 0, max: 0 },
        userDefined: true,
      },
      {
        name: 'bar',
        type: 'integer', // originally keyword
        location: { min: 0, max: 0 },
        userDefined: true,
      },
    ]);
  });

  it('handles unmapped field with LOAD strategy', () => {
    const command = synth.cmd`EVAL newField = unmappedField`;
    const result = columnsAfter(
      command,
      baseColumns,
      '',
      additionalFieldsMock,
      UnmappedFieldsStrategy.LOAD
    );

    expect(result).toEqual([
      {
        name: 'newField',
        type: 'keyword',
        location: { min: 0, max: 0 },
        userDefined: true,
      },
      ...baseColumns,
    ]);
  });

  it('handles unmapped field with NULLIFY strategy', () => {
    const command = synth.cmd`EVAL newField = unmappedField`;
    const result = columnsAfter(
      command,
      baseColumns,
      '',
      additionalFieldsMock,
      UnmappedFieldsStrategy.NULLIFY
    );

    expect(result).toEqual([
      {
        name: 'newField',
        type: 'null',
        location: { min: 0, max: 0 },
        userDefined: true,
      },
      ...baseColumns,
    ]);
  });
});
