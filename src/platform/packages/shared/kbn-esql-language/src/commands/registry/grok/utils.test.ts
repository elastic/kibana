/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractSemanticsFromGrok } from './utils';

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

    const pattern7 = '^(?<url.domain>http?s://[^/]+/)';
    const columns7 = extractSemanticsFromGrok(pattern7);
    expect(columns7).toStrictEqual([
      {
        name: 'url.domain',
        type: 'keyword',
      },
    ]);

    const pattern8 = '%{IP:client.ip} %{WORD:request.method}';
    const columns8 = extractSemanticsFromGrok(pattern8);
    expect(columns8).toStrictEqual([
      {
        name: 'client.ip',
        type: 'keyword',
      },
      {
        name: 'request.method',
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
