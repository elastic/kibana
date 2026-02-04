/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../composer/query';
import type { ESQLAstQueryExpression } from '../../types';
import { singleItems } from '../../ast/visitor/utils';
import { Walker } from '../../ast/walker';

const removeParserFields = (tree: ESQLAstQueryExpression): void => {
  Walker.walk(tree, {
    visitAny: (node) => {
      delete (node as any).text;
      delete (node as any).location;
      delete (node as any).incomplete;
      const args = (node as any).args;
      if (Array.isArray(args)) {
        (node as any).args = [...singleItems(args)];
      }
    },
  });
};

const assertSameAst = (src1: string, src2: string) => {
  const { ast: ast1, errors: errors1 } = EsqlQuery.fromSrc(src1);
  const { ast: ast2, errors: errors2 } = EsqlQuery.fromSrc(src2);

  expect(errors1.length).toBe(0);
  expect(errors2.length).toBe(0);

  removeParserFields(ast1);
  removeParserFields(ast2);

  expect(ast1).toEqual(ast2);
};

const assertDifferentAst = (src1: string, src2: string) => {
  expect(() => assertSameAst(src1, src2)).toThrow();
};

describe('binary operator precedence', () => {
  it('AND has higher precedence than OR', () => {
    assertSameAst('FROM a | WHERE a AND b OR c', 'FROM a | WHERE (a AND b) OR c');
    assertSameAst('FROM a | WHERE a OR b OR c', 'FROM a | WHERE (a OR b) OR c');
    assertSameAst('FROM a | WHERE a AND b AND c', 'FROM a | WHERE (a AND b) AND c');
    assertDifferentAst('FROM a | WHERE a OR b AND c', 'FROM a | WHERE (a OR b) AND c');
  });

  it('LIKE (regex) has higher precedence than AND', () => {
    assertSameAst('FROM a | WHERE a LIKE "b" OR c', 'FROM a | WHERE (a LIKE "b") OR c');
    assertDifferentAst('FROM a | WHERE a AND b LIKE "c"', 'FROM a | WHERE (a AND b) LIKE "c"');
  });

  it('comparison has higher precedence than AND', () => {
    assertSameAst('FROM a | WHERE a AND b < c', 'FROM a | WHERE a AND (b < c)');
    assertSameAst('FROM a | WHERE a < b AND c', 'FROM a | WHERE (a < b) AND c');
    assertDifferentAst('FROM a | WHERE a AND b < c', 'FROM a | WHERE (a AND b) < c');
    assertDifferentAst('FROM a | WHERE a < b AND c', 'FROM a | WHERE a < (b AND c)');
  });

  it('addition has higher precedence than comparison', () => {
    assertSameAst('FROM a | WHERE a > b + c', 'FROM a | WHERE a > (b + c)');
    assertSameAst('FROM a | WHERE a + b > c', 'FROM a | WHERE (a + b) > c');
    assertDifferentAst('FROM a | WHERE a > b + c', 'FROM a | WHERE (a > b) + c');
    assertDifferentAst('FROM a | WHERE a + b > c', 'FROM a | WHERE a + (b > c)');
  });

  it('addition has higher precedence than AND (and LIKE)', () => {
    assertSameAst('FROM a | WHERE a + b AND c', 'FROM a | WHERE (a + b) AND c');
    // TODO: this test should work once right side of LIKE does not return a list of "single items"
    // assertSameAst('FROM a | WHERE a + b LIKE "c"', 'FROM a | WHERE (a + b) LIKE "c"');
    assertSameAst('FROM a | WHERE a AND b + c', 'FROM a | WHERE a AND (b + c)');
    assertDifferentAst('FROM a | WHERE a + b AND c', 'FROM a | WHERE a + (b AND c)');
    assertDifferentAst('FROM a | WHERE a AND b + c', 'FROM a | WHERE (a AND b) + c');
  });

  it('multiplication has higher precedence than addition', () => {
    assertSameAst('FROM a | WHERE a * b + c', 'FROM a | WHERE (a * b) + c');
    assertSameAst('FROM a | WHERE a + b * c', 'FROM a | WHERE a + (b * c)');
    assertDifferentAst('FROM a | WHERE a * b + c', 'FROM a | WHERE a * (b + c)');
    assertDifferentAst('FROM a | WHERE a + b * c', 'FROM a | WHERE (a + b) * c');
  });

  it('grouping addition in comparison is not necessary', () => {
    assertSameAst(
      'FROM a | EVAL key = CASE(timestamp < t - 1 hour AND timestamp > t - 2 hour)',
      'FROM a | EVAL key = CASE(timestamp < (t - 1 hour) AND timestamp > (t - 2 hour))'
    );
  });
});
