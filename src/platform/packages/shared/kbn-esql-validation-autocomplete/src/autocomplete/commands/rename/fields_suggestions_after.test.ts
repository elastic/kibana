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

describe('fieldsSuggestionsAfterRename', () => {
  it('should return the correct fields after the command', () => {
    const renameCommand = {
      name: 'rename',
      args: [
        {
          type: 'option',
          name: 'as',
          text: 'field1ASmeow',
          location: {
            min: 63,
            max: 75,
          },
          args: [
            {
              args: [
                {
                  name: 'field1',
                  location: {
                    min: 63,
                    max: 67,
                  },
                  text: 'field1',
                  incomplete: false,
                  type: 'identifier',
                },
              ],
              location: {
                min: 63,
                max: 67,
              },
              text: 'field1',
              incomplete: false,
              parts: ['field1'],
              quoted: false,
              name: 'field1',
              type: 'column',
            },
            {
              args: [
                {
                  name: 'meow',
                  location: {
                    min: 72,
                    max: 75,
                  },
                  text: 'meow',
                  incomplete: false,
                  type: 'identifier',
                },
              ],
              location: {
                min: 72,
                max: 75,
              },
              text: 'meow',
              incomplete: false,
              parts: ['meow'],
              quoted: false,
              name: 'meow',
              type: 'column',
            },
          ],
          incomplete: false,
        },
      ],
      location: {
        min: 56,
        max: 75,
      },
      text: 'RENAMEfield1ASmeow',
      incomplete: false,
      type: 'command',
    } as unknown as ESQLAstCommand;
    const previousCommandFields = [
      { name: 'field1', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ] as ESQLRealField[];

    const userDefinedColumns = [] as ESQLRealField[];

    const result = fieldsSuggestionsAfter(renameCommand, previousCommandFields, userDefinedColumns);

    expect(result).toEqual([
      { name: 'meow', type: 'keyword' },
      { name: 'field2', type: 'double' },
    ]);
  });
});
