/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';
import { getFullTextTargets, isTextColumn } from './full_text_match';

const getTargets = (condition: string) => {
  const { root } = Parser.parse(`FROM a | WHERE ${condition}`);
  const [, where] = root.commands as ESQLCommand[];
  const { fields, all } = getFullTextTargets(where.args[0]);

  return { fields: [...fields], all };
};

describe('getFullTextTargets', () => {
  it.each([
    ['MATCH(a, "x")', { fields: ['a'], all: false }],
    ['a : "x"', { fields: ['a'], all: false }],
    ['MATCH_PHRASE(a, "x")', { fields: ['a'], all: false }],
    ['QSTR("x")', { fields: [], all: true }],
    ['KQL("a: x")', { fields: [], all: true }],
    ['MATCH(a, "x") AND QSTR("y")', { fields: ['a'], all: true }],
    ['MATCH(a, "x") AND n > 1', { fields: ['a'], all: false }],
    ['MATCH(a, "x") AND MATCH(b, "y")', { fields: ['a', 'b'], all: false }],
    ['MATCH(a, "x") OR MATCH(b, "y")', { fields: ['a', 'b'], all: false }],
    ['(MATCH(a, "x") OR QSTR("y")) AND n > 1', { fields: ['a'], all: true }],
    ['MATCH(?field, "x")', { fields: [], all: true }],
    ['??field : "x"', { fields: [], all: true }],
  ])('%s', (condition, expected) => {
    expect(getTargets(condition)).toEqual(expected);
  });

  it.each([
    'NOT MATCH(a, "x")',
    'MATCH(a, "x") OR n > 1',
    'MATCH(a, "x") AND NOT MATCH(b, "y") AND n > 1',
    'n > 1',
    'TERM(a, "x")',
  ])('does not reuse %s', (condition) => {
    const targets = getTargets(condition);

    expect(targets.all).toBe(false);
    expect(targets.fields).not.toContain('b');
    if (condition !== 'MATCH(a, "x") AND NOT MATCH(b, "y") AND n > 1') {
      expect(targets.fields).toEqual([]);
    }
  });
});

describe('isTextColumn', () => {
  it.each([
    ['text', 'title', true],
    ['keyword', 'author', true],
    ['semantic_text', 'body', true],
    ['integer', 'year', false],
    ['keyword', '_id', false],
    ['keyword', '_index', false],
    ['keyword', '$$title$converted_to$text', false],
  ])('%s column %s: %s', (type, name, expected) => {
    expect(isTextColumn({ name, type, userDefined: false } as never)).toBe(expected);
  });
});
