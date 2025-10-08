/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { synth } from '../../../..';
import type { ESQLFieldWithMetadata } from '../../types';
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

      const pattern4 = '(sometext) (?<foo>\\S+)';
      const columns4 = extractSemanticsFromGrok(pattern4);
      expect(columns4).toStrictEqual(['foo']);

      const pattern5 = '%{IP:clientip} (?<user>\\w+)';
      const columns5 = extractSemanticsFromGrok(pattern5);
      expect(columns5).toStrictEqual(['clientip', 'user']);

      const pattern6 = '(?<queue_id>[0-9A-F]{10,11})';
      const columns6 = extractSemanticsFromGrok(pattern6);
      expect(columns6).toStrictEqual(['queue_id']);
    });
  });
  describe('columnsAfter', () => {
    it('adds the GROK columns from the pattern in the list', () => {
      const previousCommandFields: ESQLFieldWithMetadata[] = [
        { name: 'field1', type: 'keyword', userDefined: false },
        { name: 'field2', type: 'double', userDefined: false },
      ];

      const result = columnsAfter(
        synth.cmd`GROK agent "%{WORD:firstWord}"`,
        previousCommandFields,
        ''
      );

      expect(result).toEqual([
        { name: 'field1', type: 'keyword', userDefined: false },
        { name: 'field2', type: 'double', userDefined: false },
        { name: 'firstWord', type: 'keyword', userDefined: false },
      ]);
    });
  });
});
