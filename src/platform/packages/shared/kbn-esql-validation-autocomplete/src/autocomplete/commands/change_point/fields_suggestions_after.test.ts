/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '@kbn/esql-ast';
import type { ESQLRealField } from '../../../validation/types';
import { fieldsSuggestionsAfter } from './fields_suggestions_after';

describe('CHANGE_POINT', () => {
  it('adds "type" and "pvalue" fields, when AS option not specified', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
    ] as ESQLRealField[];

    const userDefinedColumns = [] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(
      synth.cmd`CHANGE_POINT count ON field1`,
      previousCommandFields,
      userDefinedColumns
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
    ] as ESQLRealField[];

    const userDefinedColumns = [] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(
      synth.cmd`CHANGE_POINT count ON field1 AS changePointType, pValue`,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
      { name: 'changePointType', type: 'keyword' },
      { name: 'pValue', type: 'double' },
    ]);
  });
});
