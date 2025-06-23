/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '@kbn/esql-ast';
import type { ESQLFieldWithMetadata } from '../../../validation/types';
import { fieldsSuggestionsAfter } from './fields_suggestions_after';

describe('COMPLETION', () => {
  it('adds "completion" field, when targetField is not specified', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
    ] as ESQLFieldWithMetadata[];

    const userDefinedColumns = [] as ESQLFieldWithMetadata[];

    const result = fieldsSuggestionsAfter(
      synth.cmd`COMPLETION "prompt" WITH inferenceId`,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
      { name: 'completion', type: 'keyword' },
    ]);
  });

  it('adds the given targetField as field, when targetField is specified', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
    ] as ESQLFieldWithMetadata[];

    const userDefinedColumns = [] as ESQLFieldWithMetadata[];

    const result = fieldsSuggestionsAfter(
      synth.cmd`COMPLETION customField = "prompt" WITH inferenceId`,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([
      { name: 'field1', type: 'keyword' },
      { name: 'count', type: 'double' },
      { name: 'customField', type: 'keyword' },
    ]);
  });
});
