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
  appendWhereCommand,
  esqlAnd,
  esqlEquals,
  esqlFunction,
  esqlIn,
  esqlOr,
  esqlString,
} from './esql_expressions';

const render = (clause: ESQLAstExpression): string => {
  const query = esql.from('logs-*');
  appendWhereCommand(query, clause);
  return query.print('pipe-multiline');
};

describe('esqlAnd', () => {
  it('combines expressions left-associatively', () => {
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

  it('combines three expressions left-associatively', () => {
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

describe('appendWhereCommand', () => {
  it('mutates the query in place, appending after the commands already on it', () => {
    const query = esql.from('logs-*');

    appendWhereCommand(query, esqlEquals('a', '1'));
    appendWhereCommand(query, esqlEquals('b', '2'));

    expect(query.print('pipe-multiline')).toBe(
      'FROM logs-*\n  | WHERE a == "1"\n  | WHERE b == "2"'
    );
  });
});

describe('string literal escaping', () => {
  it('escapes a backslash exactly once when the literal is printed on its own', () => {
    expect(LeafPrinter.string(esqlString('handlers\\run.cs'))).toBe('"handlers\\\\run.cs"');
  });

  it('escapes a backslash exactly once', () => {
    expect(render(esqlEquals('error.culprit', 'handlers\\windows\\run.cs'))).toBe(
      'FROM logs-*\n  | WHERE error.culprit == "handlers\\\\windows\\\\run.cs"'
    );
  });

  it('escapes backslashes inside IN lists exactly once', () => {
    expect(render(esqlIn('trace.id', ['trace\\n1']))).toBe(
      'FROM logs-*\n  | WHERE trace.id IN ("trace\\\\n1")'
    );
  });
});
