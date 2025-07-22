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

describe('CHANGE_POINT > columnsAfter', () => {
  const context = {
    userDefinedColumns: new Map<string, ESQLUserDefinedColumn[]>([]),
    fields: new Map<string, ESQLFieldWithMetadata>([
      ['field1', { name: 'field1', type: 'keyword' }],
      ['count', { name: 'count', type: 'double' }],
    ]),
  };
  it('adds "type" and "pvalue" fields, when AS option not specified', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
    ] as ESQLFieldWithMetadata[];

    const result = columnsAfter(
      synth.cmd`CHANGE_POINT count ON field1`,
      previousCommandFields,
      context
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
      { name: 'type', type: 'keyword' },
      { name: 'pvalue', type: 'double' },
    ]);
  });

  it('adds the given names as fields, when AS option is specified', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
    ] as ESQLFieldWithMetadata[];

    const result = columnsAfter(
      synth.cmd`CHANGE_POINT count ON field1 AS changePointType, pValue`,
      previousCommandFields,
      context
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
      { name: 'changePointType', type: 'keyword' },
      { name: 'pValue', type: 'double' },
    ]);
  });
});
