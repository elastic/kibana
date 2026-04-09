/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendToESQLQuery, escapeEsqlStringValue } from './utils';

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

describe('escapeEsqlStringValue', () => {
  it('wraps value in double quotes', () => {
    expect(escapeEsqlStringValue('hello')).toBe('"hello"');
  });

  it('escapes backslashes', () => {
    expect(escapeEsqlStringValue('path\\to\\file')).toBe('"path\\\\to\\\\file"');
  });

  it('escapes double quotes', () => {
    expect(escapeEsqlStringValue('say "hello"')).toBe('"say \\"hello\\""');
  });

  it('escapes newlines', () => {
    expect(escapeEsqlStringValue('line1\nline2')).toBe('"line1\\nline2"');
  });

  it('escapes carriage returns', () => {
    expect(escapeEsqlStringValue('line1\rline2')).toBe('"line1\\rline2"');
  });

  it('escapes tabs', () => {
    expect(escapeEsqlStringValue('col1\tcol2')).toBe('"col1\\tcol2"');
  });

  it('handles all special characters combined', () => {
    expect(escapeEsqlStringValue('a\\b"c\nd\re\tf')).toBe('"a\\\\b\\"c\\nd\\re\\tf"');
  });
});
