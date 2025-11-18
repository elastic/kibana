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
      expect(columns1).toStrictEqual([
        {
          name: 'ip',
          type: 'keyword',
        },
        {
          name: '@timestamp',
          type: 'keyword',
        },
        {
          name: 'status',
          type: 'keyword',
        },
      ]);

      const pattern2 = '%{WORD:word1} - %{NUMBER:count}';
      const columns2 = extractSemanticsFromGrok(pattern2);
      expect(columns2).toStrictEqual([
        {
          name: 'word1',
          type: 'keyword',
        },
        {
          name: 'count',
          type: 'keyword',
        },
      ]);

      const pattern3 = 'Some plain text without grok patterns';
      const columns3 = extractSemanticsFromGrok(pattern3);
      expect(columns3).toStrictEqual([]);

      const pattern4 = '(sometext) (?<foo>\\S+)';
      const columns4 = extractSemanticsFromGrok(pattern4);
      expect(columns4).toStrictEqual([
        {
          name: 'foo',
          type: 'keyword',
        },
      ]);

      const pattern5 = '%{IP:clientip} (?<user>\\w+)';
      const columns5 = extractSemanticsFromGrok(pattern5);
      expect(columns5).toStrictEqual([
        {
          name: 'clientip',
          type: 'keyword',
        },
        {
          name: 'user',
          type: 'keyword',
        },
      ]);

      const pattern6 = '(?<queue_id>[0-9A-F]{10,11})';
      const columns6 = extractSemanticsFromGrok(pattern6);
      expect(columns6).toStrictEqual([
        {
          name: 'queue_id',
          type: 'keyword',
        },
      ]);
    });

    describe('GROK column type extraction', () => {
      it.each([
        {
          description: 'integer type from grok patterns',
          pattern: '(?:%{NUMBER:bytes:int}|-)',
          expected: [{ name: 'bytes', type: 'integer' }],
        },
        {
          description: 'double types from grok pattern',
          pattern: '%{NUMBER:count1:double} - %{NUMBER:count2:float}',
          expected: [
            { name: 'count1', type: 'double' },
            { name: 'count2', type: 'double' },
          ],
        },
        {
          description: 'long type from grok pattern',
          pattern: '%{NUMBER:count:long}',
          expected: [{ name: 'count', type: 'long' }],
        },
        {
          description: 'boolean type from grok pattern',
          pattern: '%{NUMBER:bool:boolean}',
          expected: [{ name: 'bool', type: 'boolean' }],
        },
        {
          description: 'keyword type when type is not defined',
          pattern: '%{NUMBER:field}',
          expected: [{ name: 'field', type: 'keyword' }],
        },
        {
          description: 'keyword type when type is not valid',
          pattern: '%{NUMBER:field:weirdType}',
          expected: [{ name: 'field', type: 'keyword' }],
        },
      ])('should extract $description', ({ pattern, expected }) => {
        const columns = extractSemanticsFromGrok(pattern);
        expect(columns).toStrictEqual(expected);
      });
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

    it('adds the GROK columns from the pattern with the correct type', () => {
      const result = columnsAfter(synth.cmd`GROK agent "%{NUMBER:count:int}"`, [], '');

      expect(result).toEqual([{ name: 'count', type: 'integer', userDefined: false }]);
    });

    it('adds columns from multiple grok patterns', () => {
      const previousCommandFields: ESQLFieldWithMetadata[] = [
        { name: 'message', type: 'keyword', userDefined: false },
      ];

      const result = columnsAfter(
        synth.cmd`GROK message "%{IP:client_ip}", "%{WORD:method}", "%{NUMBER:status:int}"`,
        previousCommandFields,
        ''
      );

      expect(result).toEqual([
        { name: 'message', type: 'keyword', userDefined: false },
        { name: 'client_ip', type: 'keyword', userDefined: false },
        { name: 'method', type: 'keyword', userDefined: false },
        { name: 'status', type: 'integer', userDefined: false },
      ]);
    });

    it('merges columns from multiple patterns without duplicates', () => {
      const previousCommandFields: ESQLFieldWithMetadata[] = [
        { name: 'field1', type: 'keyword', userDefined: false },
      ];

      // Same field extracted from multiple patterns
      const result = columnsAfter(
        synth.cmd`GROK message "%{IP:ip_address}", "%{IP:ip_address}"`,
        previousCommandFields,
        ''
      );

      expect(result).toEqual([
        { name: 'field1', type: 'keyword', userDefined: false },
        { name: 'ip_address', type: 'keyword', userDefined: false },
      ]);
    });
  });
});
