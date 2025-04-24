/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { type ESQLAstCommand } from '@kbn/esql-ast';
import type { ESQLRealField } from '../../../validation/types';
import { fieldsSuggestionsAfter } from './fields_suggestions_after';

describe('fieldsSuggestionsAfterDrop', () => {
  it('should return the correct fields after the command', () => {
    const dropCommand = {
      name: 'drop',
      args: [
        {
          args: [
            {
              name: 'field1',
              location: {
                min: 36,
                max: 40,
              },
              text: 'field1',
              incomplete: false,
              type: 'identifier',
            },
          ],
          location: {
            min: 36,
            max: 40,
          },
          text: 'field1',
          incomplete: false,
          parts: ['field1'],
          quoted: false,
          name: 'field1',
          type: 'column',
        },
      ],
      location: {
        min: 31,
        max: 40,
      },
      text: 'DROPfield1',
      incomplete: false,
      type: 'command',
    } as unknown as ESQLAstCommand;
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLRealField[];

    const userDefinedColumns = [] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(dropCommand, previousCommandFields, userDefinedColumns);

    expect(result).toEqual([{ name: 'field2', type: 'double' }]);
  });
});
