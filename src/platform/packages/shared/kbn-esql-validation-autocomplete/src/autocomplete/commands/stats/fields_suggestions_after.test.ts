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

describe('STATS', () => {
  it('adds the user defined column, when no grouping is given', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLRealField[];

    const userDefinedColumns = [{ name: 'var0', type: 'double' }] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(
      synth.cmd`STATS var0=AVG(field2)`,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([{ name: 'var0', type: 'double' }]);
  });

  it('adds the escaped column, when no grouping is given', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLRealField[];

    const userDefinedColumns = [{ name: 'AVG(field2)', type: 'double' }] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(
      synth.cmd`STATS AVG(field2)`,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([{ name: 'AVG(field2)', type: 'double' }]);
  });

  it('adds the escaped and grouping columns', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLRealField[];

    const userDefinedColumns = [{ name: 'AVG(field2)', type: 'double' }] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(
      synth.cmd`STATS AVG(field2) BY field1`,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword' },
      { name: 'AVG(field2)', type: 'double' },
    ]);
  });

  it('adds the user defined and grouping columns', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
      { name: '@timestamp', type: 'date' },
    ] as ESQLRealField[];

    const userDefinedColumns = [
      { name: 'AVG(field2)', type: 'double' },
      { name: 'buckets', type: 'unknown' },
    ] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(
      synth.cmd`STATS AVG(field2) BY buckets=BUCKET(@timestamp,50,?_tstart,?_tend)`,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([
      { name: 'AVG(field2)', type: 'double' },
      { name: 'buckets', type: 'unknown' },
    ]);
  });
});
