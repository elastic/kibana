/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql, LeafPrinter } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import { esqlColumn } from './esql_column';
import {
  esqlAnd,
  esqlEquals,
  esqlFunction,
  esqlIn,
  esqlOr,
  esqlString,
  isNonEmptyArray,
} from './esql_expressions';

const render = (clause: ESQLAstExpression): string => {
  const query = esql.from('logs-*');
  query.where`${clause}`;
  return query.print('pipe-multiline');
};

describe('esqlAnd', () => {
  it('prints a chain of three without redundant parentheses', () => {
    const clause = esqlAnd([esqlEquals('a', '1'), esqlEquals('b', '2'), esqlEquals('c', '3')]);

    expect(render(clause)).toBe('FROM logs-*\n  | WHERE a == "1" AND b == "2" AND c == "3"');
  });

  it('returns the expression itself when given a single one', () => {
    const only = esqlEquals('a', '1');

    expect(esqlAnd([only])).toBe(only);
  });
});

describe('esqlOr', () => {
  it('is parenthesized when nested inside an AND, so precedence is preserved', () => {
    const clause = esqlAnd([
      esqlEquals('trace.id', 't'),
      esqlOr([esqlEquals('transaction.id', 'x'), esqlEquals('span.id', 'y')]),
    ]);

    expect(render(clause)).toBe(
      'FROM logs-*\n  | WHERE trace.id == "t" AND (transaction.id == "x" OR span.id == "y")'
    );
  });

  it('prints a chain of three without redundant parentheses', () => {
    const clause = esqlOr([esqlEquals('a', '1'), esqlEquals('b', '2'), esqlEquals('c', '3')]);

    expect(render(clause)).toBe('FROM logs-*\n  | WHERE a == "1" OR b == "2" OR c == "3"');
  });

  it('returns the expression itself when given a single one', () => {
    const only = esqlEquals('a', '1');

    expect(esqlOr([only])).toBe(only);
  });
});

describe('esqlIn', () => {
  it('emits parentheses rather than the square brackets of a list literal', () => {
    expect(render(esqlIn('trace.id', ['a', 'b']))).toBe(
      'FROM logs-*\n  | WHERE trace.id IN ("a", "b")'
    );
  });
});

describe('isNonEmptyArray', () => {
  it('accepts an array holding at least one value', () => {
    expect(isNonEmptyArray(['a'])).toBe(true);
  });

  it('rejects an empty array', () => {
    expect(isNonEmptyArray([])).toBe(false);
  });
});

describe('esqlFunction', () => {
  it('prints a call with its arguments', () => {
    const clause = esqlFunction('MATCH', [
      esqlColumn('exception.type'),
      esqlString('QuotedPathError'),
    ]);

    expect(render(clause)).toBe('FROM logs-*\n  | WHERE MATCH(exception.type, "QuotedPathError")');
  });

  it('prints a call without arguments', () => {
    expect(render(esqlFunction('NOW', []))).toBe('FROM logs-*\n  | WHERE NOW()');
  });
});

describe('string literal escaping', () => {
  it('escapes a backslash exactly once when the literal is printed on its own', () => {
    expect(LeafPrinter.string(esqlString(String.raw`handlers\run.cs`))).toBe(
      String.raw`"handlers\\run.cs"`
    );
  });

  it('escapes a backslash exactly once', () => {
    expect(render(esqlEquals('error.culprit', String.raw`handlers\windows\run.cs`))).toBe(
      String.raw`FROM logs-*
  | WHERE error.culprit == "handlers\\windows\\run.cs"`
    );
  });

  it('escapes backslashes inside IN lists exactly once', () => {
    expect(render(esqlIn('trace.id', [String.raw`trace\n1`]))).toBe(
      String.raw`FROM logs-*
  | WHERE trace.id IN ("trace\\n1")`
    );
  });
});
