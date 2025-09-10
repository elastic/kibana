/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import type { ESQLFieldWithMetadata, ESQLUserDefinedColumn } from '../../types';
import { columnsAfter } from './columns_after';

describe('RENAME', () => {
  const context = {
    userDefinedColumns: new Map<string, ESQLUserDefinedColumn[]>([]),
    fields: new Map<string, ESQLFieldWithMetadata>([
      ['field1', { name: 'field1', type: 'keyword' }],
      ['count', { name: 'count', type: 'double' }],
    ]),
  };
  it('renames the given columns with the new names using AS', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLFieldWithMetadata[];

    const result = columnsAfter(synth.cmd`RENAME field1 as meow`, previousCommandFields, context);

    expect(result).toEqual([
      { name: 'meow', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ]);
  });

  it('renames the given columns with the new names using ASSIGN', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLFieldWithMetadata[];

    const result = columnsAfter(synth.cmd`RENAME meow = field1`, previousCommandFields, context);

    expect(result).toEqual([
      { name: 'meow', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ]);
  });

  it('renames the given columns with the new names using a mix of ASSIGN and =', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLFieldWithMetadata[];

    const result = columnsAfter(
      synth.cmd`RENAME meow = field1, field2 as woof`,
      previousCommandFields,
      context
    );

    expect(result).toEqual([
      { name: 'meow', type: 'keyword' },
      { name: 'woof', type: 'double' },
    ]);
  });
});
