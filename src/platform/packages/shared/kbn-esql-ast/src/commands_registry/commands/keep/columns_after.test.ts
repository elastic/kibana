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

describe('KEEP', () => {
  const context = {
    userDefinedColumns: new Map<string, ESQLUserDefinedColumn[]>([]),
    fields: new Map<string, ESQLFieldWithMetadata>([
      ['field1', { name: 'field1', type: 'keyword', userDefined: false }],
      ['count', { name: 'count', type: 'double', userDefined: false }],
    ]),
  };
  it('should return the correct fields after the command', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ] as ESQLFieldWithMetadata[];

    const result = columnsAfter(synth.cmd`KEEP field1`, previousCommandFields, '', context);

    expect(result).toEqual([{ name: 'field1', type: 'keyword' }]);
  });
});
