/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, Walker } from '@kbn/esql-ast';
import type { ESQLFunction } from '@kbn/esql-ast';
import { appendToESQLQuery, escapeStringValue } from './utils';
import { extractMvContainsFunctionDetails } from './utils';

describe('appendToESQLQuery', () => {
  it('append the text on a new line after the query', () => {
    expect(appendToESQLQuery('from logstash-* // meow', '| stats var = avg(woof)')).toBe(
      `from logstash-* // meow
| stats var = avg(woof)`
    );
  });

  it('append the text on a new line after the query for text with variables', () => {
    const limit = 10;
    expect(appendToESQLQuery('from logstash-*', `| limit ${limit}`)).toBe(
      `from logstash-*
| limit 10`
    );
  });
});

describe('escapeStringValue', () => {
  it('wraps value in double quotes', () => {
    expect(escapeStringValue('hello')).toBe('"hello"');
  });

  it('escapes backslashes', () => {
    expect(escapeStringValue('path\\to\\file')).toBe('"path\\\\to\\\\file"');
  });

  it('escapes double quotes', () => {
    expect(escapeStringValue('say "hello"')).toBe('"say \\"hello\\""');
  });

  it('escapes newlines', () => {
    expect(escapeStringValue('line1\nline2')).toBe('"line1\\nline2"');
  });

  it('escapes carriage returns', () => {
    expect(escapeStringValue('line1\rline2')).toBe('"line1\\rline2"');
  });

  it('escapes tabs', () => {
    expect(escapeStringValue('col1\tcol2')).toBe('"col1\\tcol2"');
  });

  it('handles all special characters combined', () => {
    expect(escapeStringValue('a\\b"c\nd\re\tf')).toBe('"a\\\\b\\"c\\nd\\re\\tf"');
  });
});

describe('extractMvContainsFunctionDetails', () => {
  const getMvContainsFunction = (query: string): ESQLFunction => {
    const { root } = Parser.parse(query);
    const lastCommand = root.commands[root.commands.length - 1];

    return Walker.findAll(
      lastCommand,
      (node) => node.type === 'function' && node.name === 'mv_contains'
    )[0] as ESQLFunction;
  };

  it('extracts values from MV_CONTAINS lists with inline casts', () => {
    expect(
      extractMvContainsFunctionDetails(
        getMvContainsFunction(
          'from logstash-* | WHERE MV_CONTAINS(`tags.keyword`, ["info", "success"]::keyword)'
        )
      )
    ).toEqual({
      columnName: 'tags.keyword',
      literalValues: ['info', 'success'],
    });
  });

  it('extracts values from MV_CONTAINS lists without inline casts', () => {
    expect(
      extractMvContainsFunctionDetails(
        getMvContainsFunction('from logstash-* | WHERE MV_CONTAINS(`bytes`, [1, 2])')
      )
    ).toEqual({
      columnName: 'bytes',
      literalValues: [1, 2],
    });
  });

  it('extracts scalar values from MV_CONTAINS without inline casts', () => {
    expect(
      extractMvContainsFunctionDetails(
        getMvContainsFunction('from logstash-* | WHERE MV_CONTAINS(`tags.keyword`, "info")')
      )
    ).toEqual({
      columnName: 'tags.keyword',
      literalValues: ['info'],
    });
  });

  it('extracts scalar values from MV_CONTAINS with inline casts', () => {
    expect(
      extractMvContainsFunctionDetails(
        getMvContainsFunction(
          'from logstash-* | WHERE MV_CONTAINS(`tags.keyword`, "info"::keyword)'
        )
      )
    ).toEqual({
      columnName: 'tags.keyword',
      literalValues: ['info'],
    });
  });
});
