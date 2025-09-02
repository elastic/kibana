/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import type { ESQLColumnData, ESQLFieldWithMetadata } from '../../types';
import { columnsAfter } from './columns_after';

describe('KEEP', () => {
  const columns = new Map<string, ESQLColumnData>([
    ['field1', { name: 'field1', type: 'keyword', userDefined: false }],
    ['count', { name: 'count', type: 'double', userDefined: false }],
  ]);
  const context = { columns };
  it('should return the correct fields after the command', () => {
    const previousCommandFields: ESQLFieldWithMetadata[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'field2', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(synth.cmd`KEEP field1`, previousCommandFields, '', context);

    expect(result).toEqual([{ name: 'field1', type: 'keyword', userDefined: false }]);
  });
});
