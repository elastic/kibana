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

describe('RENAME', () => {
  it('renames the given columns with the new names', () => {
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLFieldWithMetadata[];

    const userDefinedColumns = [] as ESQLFieldWithMetadata[];

    const result = fieldsSuggestionsAfter(
      synth.cmd`RENAME field1 as meow`,
      previousCommandFields,
      userDefinedColumns
    );

    expect(result).toEqual([
      { name: 'meow', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ]);
  });
});
