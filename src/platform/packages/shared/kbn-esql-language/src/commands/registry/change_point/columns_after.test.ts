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

describe('CHANGE_POINT > columnsAfter', () => {
  it('adds "type" and "pvalue" fields, when AS option not specified', () => {
    const previousCommandFields: ESQLColumnData[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'count', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(synth.cmd`CHANGE_POINT count ON field1`, previousCommandFields, '');

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'count', type: 'double', userDefined: false },
      { name: 'type', type: 'keyword', userDefined: false },
      { name: 'pvalue', type: 'double', userDefined: false },
    ]);
  });

  it('adds the given names as fields, when AS option is specified', () => {
    const previousCommandFields: ESQLColumnData[] = [
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'count', type: 'double', userDefined: false },
    ];

    const result = columnsAfter(
      synth.cmd`CHANGE_POINT count ON field1 AS changePointType, pValue`,
      previousCommandFields,
      ''
    );

    expect(result).toEqual<ESQLColumnData[]>([
      { name: 'field1', type: 'keyword', userDefined: false },
      { name: 'count', type: 'double', userDefined: false },
      {
        name: 'changePointType',
        type: 'keyword',
        userDefined: true,
        location: { min: 0, max: 0 },
      },
      { name: 'pValue', type: 'double', userDefined: true, location: { min: 0, max: 0 } },
    ]);
  });
});
