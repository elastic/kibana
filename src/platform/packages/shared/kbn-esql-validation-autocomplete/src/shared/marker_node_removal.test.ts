/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EDITOR_MARKER } from '@kbn/esql-ast/src/definitions/constants';
import { correctQuerySyntax } from '@kbn/esql-ast/src/definitions/utils/ast';
import { ESQLAstItem, Parser, Walker } from '@kbn/esql-ast';
import { getAstContext, isMarkerNode } from './context';

const assertMarkerRemoved = (_query: string) => {
  const query = correctQuerySyntax(_query);
  if (!query.includes(EDITOR_MARKER)) {
    throw new Error(`Query does not contain marker: ${query}`);
  }

  const { ast } = Parser.parse(query);
  const result = getAstContext(query, ast, _query.length);

  if (!result.command) {
    throw new Error(`No command found in AST for query: ${query}`);
  }

  Walker.walk(result.command, {
    visitAny(node) {
      if (isMarkerNode(node as ESQLAstItem)) {
        throw new Error(`Marker node found in AST for query: ${query}`);
      }
    },
  });
};

describe('it should remove marker nodes from the AST', () => {
  it('should remove marker', () => {
    // FROM command with binary operator
    assertMarkerRemoved(`FROM employees | WHERE age > `);
    assertMarkerRemoved(`FROM employees | WHERE salary = `);
    assertMarkerRemoved(`FROM employees | WHERE name != `);
    assertMarkerRemoved(`FROM employees | WHERE status IN `);
    assertMarkerRemoved(`FROM employees | WHERE age >= `);
    assertMarkerRemoved(`FROM employees | WHERE age <= `);
    assertMarkerRemoved(`FROM employees | WHERE name LIKE `);
    assertMarkerRemoved(`FROM employees | WHERE id AS `);
    assertMarkerRemoved(`FROM employees | WHERE id AND `);
    assertMarkerRemoved(`FROM employees | WHERE id OR `);

    // FROM command with comma (incomplete argument list)
    assertMarkerRemoved(`FROM employees | STATS avg(salary), `);
    assertMarkerRemoved(`FROM employees | STATS max(salary), `);
    assertMarkerRemoved(`FROM employees | STATS min(salary), `);
    assertMarkerRemoved(`FROM employees | STATS count(*), `);
    assertMarkerRemoved(`FROM employees | KEEP name, `);
    assertMarkerRemoved(`FROM employees | SORT age, `);
    assertMarkerRemoved(`FROM employees | EVAL bonus = salary * 0.1, `);

    // ROW command with comma
    assertMarkerRemoved(`ROW a = 1, `);
    assertMarkerRemoved(`ROW a = 1, b = 2, `);

    // ROW command with binary operator
    assertMarkerRemoved(`ROW a = 1 + `);
    assertMarkerRemoved(`ROW a = b - `);
    assertMarkerRemoved(`ROW a = b * `);
    assertMarkerRemoved(`ROW a = b / `);
    assertMarkerRemoved(`ROW a = b % `);

    // SHOW command (not likely to have binary/comma, but for completeness)
    assertMarkerRemoved(`SHOW info, `);
    assertMarkerRemoved(`SHOW info = `);

    // EVAL command with binary operator and comma
    assertMarkerRemoved(`FROM employees | EVAL total = salary + `);
    assertMarkerRemoved(`FROM employees | EVAL total = salary + bonus, `);

    // STATS command with binary operator and comma
    assertMarkerRemoved(`FROM employees | STATS avg(salary) = `);
    assertMarkerRemoved(`FROM employees | STATS avg(salary), `);

    // KEEP command with comma
    assertMarkerRemoved(`FROM employees | KEEP name, `);

    // SORT command with comma
    assertMarkerRemoved(`FROM employees | SORT age, `);
  });
});
