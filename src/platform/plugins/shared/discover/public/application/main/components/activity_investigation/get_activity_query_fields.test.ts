/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import { getActivityQueryFields } from './get_activity_query_fields';

const select = (query: string, names: string[]): string[] =>
  [...getActivityQueryFields(Parser.parse(query).root.commands, names.map((name) => ({ name })))];

describe('getActivityQueryFields', () => {
  it('does not infer preferences from source names or an unrestricted KEEP', () => {
    expect(select('FROM logs*,-logstash*,filebeat-* | KEEP *', ['service.name', 'zip'])).toEqual([]);
  });

  it('uses filtered columns, not string literals or comments', () => {
    expect(
      select('FROM logs | WHERE service.name == "zip" /* WHERE bytes > 10 */', [
        'service.name',
        'zip',
        'bytes',
      ])
    ).toEqual(['service.name']);
  });

  it('matches explicit KEEP patterns but not quoted literal asterisks', () => {
    expect(
      select('FROM logs | KEEP service.*, `literal*`, *', [
        'service.name',
        'service.type',
        'literal*',
        'literal_other',
        'zip',
      ])
    ).toEqual(['service.name', 'service.type', 'literal*']);
  });

  it('prioritizes an EVAL output, not all operands of its expression', () => {
    expect(select('FROM logs | EVAL kib = bytes / 1024.0', ['bytes', 'kib', 'zip'])).toEqual([
      'kib',
    ]);
  });

  it('uses the renamed output and never restores a removed field', () => {
    expect(
      select('FROM logs | WHERE response == "500" | RENAME response AS status | DROP zip', [
        'status',
        'clientip',
      ])
    ).toEqual(['status']);
  });

  it('handles assignment-style renames and quoted names', () => {
    expect(select('FROM logs | RENAME `status code` = response', ['status code'])).toEqual([
      'status code',
    ]);
  });

  it('only returns fields present in the final output', () => {
    expect(
      select('FROM logs | WHERE response == "500" | EVAL total = bytes * 2 | KEEP clientip', [
        'clientip',
      ])
    ).toEqual(['clientip']);
  });

  it('does not treat a DROP or SORT as an explicit analysis preference', () => {
    expect(select('FROM logs | SORT zip | DROP agent', ['zip', 'bytes'])).toEqual([]);
  });
});
