/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '..';
import {
  assertQueryNesting,
  MAX_QUERY_NESTING_DEPTH,
  QUERY_NESTING_ERROR_CODE,
} from '../query_nesting';

const nest = (depth: number): string => `${'('.repeat(depth)}true${')'.repeat(depth)}`;
const tooDeep = MAX_QUERY_NESTING_DEPTH + 1;

const getTokens = (source: string) => {
  const parser = Parser.create(source);
  parser.tokens.fill();
  return parser.tokens.tokens;
};

const expectNestingError = (errors: ReturnType<typeof Parser.parseErrors>) =>
  expect(errors).toEqual([
    expect.objectContaining({
      code: QUERY_NESTING_ERROR_CODE,
      message: 'ES|QL statement contains unsupported query nesting',
    }),
  ]);

describe('query nesting', () => {
  it('allows supported nesting', () => {
    const tokens = getTokens(`ROW result = ${nest(MAX_QUERY_NESTING_DEPTH)}`);

    expect(() => assertQueryNesting(tokens)).not.toThrow();
    expect(Parser.parse(`ROW result = ${nest(MAX_QUERY_NESTING_DEPTH)}`).errors).toHaveLength(0);
  });

  it('returns a structured error for unsupported nesting', () => {
    const result = Parser.parse(`ROW result = ${nest(tooDeep)}`);

    expect(result.root.commands).toHaveLength(0);
    expectNestingError(result.errors);
  });

  it('reports unsupported nesting through parseErrors', () => {
    expectNestingError(Parser.parseErrors(`ROW result = ${nest(tooDeep)}`));
  });

  it('rejects unclosed nesting', () => {
    expectNestingError(Parser.parse(`ROW result = ${'('.repeat(tooDeep)}`).errors);
  });

  it('does not count parentheses inside strings, backticks and comments', () => {
    const open = '('.repeat(tooDeep);
    const { errors } = Parser.parse(
      `ROW result = "${open}", \`field${open}\` /* ${open} */ // ${open}`
    );

    expect(errors).toHaveLength(0);
  });

  describe('cannot be bypassed with closing parentheses in non-code text', () => {
    const closing = ')'.repeat(200);
    const payload = `ROW result = ${nest(tooDeep + 100)}`;

    it.each([
      ['a block comment', `/*${closing}*/ ${payload}`],
      ['a line comment', `// ${closing}\n${payload}`],
      ['a nested block comment', `/* /* */ ${closing} */ ${payload}`],
      ['a string', `ROW a = "${closing}", b = ${nest(tooDeep + 100)}`],
      ['a triple-quoted string', `ROW a = """${closing}""", b = ${nest(tooDeep + 100)}`],
      ['a backtick identifier', `ROW \`${closing}\` = 1, b = ${nest(tooDeep + 100)}`],
    ])('%s', (_name, query) => {
      expectNestingError(Parser.parse(query).errors);
      expectNestingError(Parser.parseErrors(query));
    });
  });

  it('rejects a deeply nested query quickly instead of running the parser rule', () => {
    const start = Date.now();
    Parser.parse(`FROM a | WHERE ${nest(2000)}`);

    expect(Date.now() - start).toBeLessThan(1000);
  });
});
