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
import { columnsAfter, extractSemanticsFromGrok } from './columns_after';

describe('GROK', () => {
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
  describe('columnsAfter', () => {
    const context = {
      userDefinedColumns: new Map<string, ESQLUserDefinedColumn[]>([]),
      fields: new Map<string, ESQLFieldWithMetadata>([
        ['field1', { name: 'field1', type: 'keyword' }],
        ['count', { name: 'count', type: 'double' }],
      ]),
    };
    it('adds the GROK columns from the pattern in the list', () => {
      const previousCommandFields = [
        { name: 'field1', type: 'keyword' },
        { name: 'field2', type: 'double' },
      ] as ESQLFieldWithMetadata[];

      const result = columnsAfter(
        synth.cmd`GROK agent "%{WORD:firstWord}"`,
        previousCommandFields,
        context
      );

      expect(result).toEqual([
        { name: 'field1', type: 'keyword' },
        { name: 'field2', type: 'double' },
        { name: 'firstWord', type: 'keyword' },
      ]);
    });
  });
});
