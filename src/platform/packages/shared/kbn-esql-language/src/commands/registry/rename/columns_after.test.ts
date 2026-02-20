/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import type { ESQLColumnData } from '../types';
import { columnsAfter } from './columns_after';

describe('RENAME', () => {
  it('renames the given columns with the new names using AS', () => {
    const previousCommandFields: ESQLColumnData[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(synth.cmd`RENAME field1 as meow`, previousCommandFields, '');

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'meow', type: 'keyword', userDefined: true, location: { max: 0, min: 0 } },
      { name: 'field2', type: 'double', userDefined: false },
    ]);
  });

  it('renames the given columns with the new names using ASSIGN', () => {
    const previousCommandFields: ESQLColumnData[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(synth.cmd`RENAME meow = field1`, previousCommandFields, '');

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'meow', type: 'keyword', userDefined: true, location: { max: 0, min: 0 } },
      { name: 'field2', type: 'double', userDefined: false },
    ]);
  });

  it('renames the given columns with the new names using a mix of ASSIGN and =', () => {
    const previousCommandFields: ESQLColumnData[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(
      synth.cmd`RENAME meow = field1, field2 as woof`,
      previousCommandFields,
      ''
    );

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'meow', type: 'keyword', userDefined: true, location: { max: 0, min: 0 } },
      { name: 'woof', type: 'double', userDefined: true, location: { max: 0, min: 0 } },
    ]);
  });
});
