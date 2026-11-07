/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeKuery, escapeQuotes } from './escape_kuery';
import { fromKueryExpression } from '../ast';
import { nodeTypes } from '../node_types';

describe('escapeQuotes', () => {
  test('should escape quotes', () => {
    const value = 'I said, "Hello."';
    const expected = 'I said, \\"Hello.\\"';

    expect(escapeQuotes(value)).toBe(expected);
  });

  test('should escape backslashes and quotes', () => {
    const value = 'Backslashes \\" in the middle and ends with quotes \\"';
    const expected = 'Backslashes \\\\\\" in the middle and ends with quotes \\\\\\"';

    expect(escapeQuotes(value)).toBe(expected);
  });
});

describe('escapeKuery', () => {
  test('should escape special characters', () => {
    const value = `This \\ has (a lot of) <special> characters, don't you *think*? "Yes."`;
    const expected = `This \\\\ has \\(a lot of\\) \\<special\\> characters, don't you \\*think\\*? \\"Yes.\\"`;

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should escape keywords', () => {
    const value = 'foo and bar or baz not qux';
    const expected = 'foo \\and bar \\or baz \\u006eot qux';

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should escape keywords next to each other', () => {
    const value = 'foo and bar or not baz';
    const expected = 'foo \\and bar \\or \\u006eot baz';

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should not escape keywords without surrounding spaces', () => {
    const value = 'And this has keywords, or does it not?';
    const expected = 'And this has keywords, \\or does it not?';

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should escape uppercase keywords', () => {
    const value = 'foo AND bar';
    const expected = 'foo \\AND bar';

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should escape both keywords and special characters', () => {
    const value = 'Hello, world, and <nice> to meet you!';
    const expected = 'Hello, world, \\and \\<nice\\> to meet you!';

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should escape newlines and tabs', () => {
    const value = 'This\nhas\tnewlines\r\nwith\ttabs';
    const expected = 'This\\nhas\\tnewlines\\r\\nwith\\ttabs';

    expect(escapeKuery(value)).toBe(expected);
  });

  test('should escape a lowercase "not" as a unicode sequence so it is not read as a newline escape', () => {
    expect(escapeKuery('do not touch')).toBe('do \\u006eot touch');
    expect(escapeKuery('Not found')).toBe('\\Not found');
  });

  test('should not escape "not" inside a word', () => {
    expect(escapeKuery('cannot connect')).toBe('cannot connect');
  });

  test.each([
    'cannot connect',
    'do not touch',
    'not this',
    'Not found',
    'NOT ME',
    'knot\ttie',
    'a and not b',
    'not not b',
    'line\nother',
    'nothing to see',
    '(special) *chars* and not <more>',
  ])('should produce a value that parses back to the original: %p', (value) => {
    const expected = nodeTypes.function.buildNodeWithArgumentNodes('is', [
      nodeTypes.literal.buildNode('message'),
      nodeTypes.literal.buildNode(value),
    ]);
    expect(fromKueryExpression(`message: ${escapeKuery(value)}`)).toEqual(expected);
  });
});
