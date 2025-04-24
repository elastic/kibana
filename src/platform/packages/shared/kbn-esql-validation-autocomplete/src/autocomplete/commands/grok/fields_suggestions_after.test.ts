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
import { extractSemanticsFromGrok, fieldsSuggestionsAfter } from './fields_suggestions_after';

describe('fieldsSuggestionsAfterGrok', () => {
  // test the semantics extraction from grok patterns
  describe('extractSemanticsFromGrok', () => {
    it('should extract column names from grok patterns', () => {
      const pattern1 = '%{IP:ip} [%{TIMESTAMP_ISO8601:@timestamp}] %{GREEDYDATA:status}';
      const columns1 = extractSemanticsFromGrok(pattern1);
      expect(columns1).toStrictEqual(['ip', '@timestamp', 'status']);

      const pattern2 = '%{WORD:word1} - %{NUMBER:count}';
      const columns2 = extractSemanticsFromGrok(pattern2);
      expect(columns2).toStrictEqual(['word1', 'count']);

      const pattern3 = 'Some plain text without grok patterns';
      const columns3 = extractSemanticsFromGrok(pattern3);
      expect(columns3).toStrictEqual([]);
    });
  });
  describe('fieldsSuggestionsAfter', () => {
    it('should return the correct fields after the command', () => {
      const grokCommand = {
        name: 'grok',
        args: [
          {
            args: [
              {
                name: 'agent',
                location: {
                  min: 61,
                  max: 65,
                },
                text: 'agent',
                incomplete: false,
                type: 'identifier',
              },
            ],
            location: {
              min: 61,
              max: 65,
            },
            text: 'agent',
            incomplete: false,
            parts: ['agent'],
            quoted: false,
            name: 'agent',
            type: 'column',
          },
          {
            name: '"%{WORD:firstWord}"',
            location: {
              min: 67,
              max: 85,
            },
            text: '"%{WORD:firstWord}"',
            incomplete: false,
            type: 'literal',
            literalType: 'keyword',
            value: '"%{WORD:firstWord}"',
            valueUnquoted: '%{WORD:firstWord}',
          },
        ],
        location: {
          min: 56,
          max: 85,
        },
        text: 'GROKagent"%{WORD:firstWord}"',
        incomplete: false,
        type: 'command',
      } as unknown as ESQLAstCommand;
      const previousCommandFields = [
        { name: 'field1', type: 'keyword' },
        { name: 'field2', type: 'double' },
      ] as ESQLRealField[];

      const userDefinedColumns = [] as ESQLRealField[];

      const result = fieldsSuggestionsAfter(grokCommand, previousCommandFields, userDefinedColumns);

      expect(result).toEqual([
        { name: 'field1', type: 'keyword' },
        { name: 'field2', type: 'double' },
        { name: 'firstWord', type: 'keyword' },
      ]);
    });
  });
});
