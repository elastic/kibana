/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAstAndSyntaxErrors } from '../../ast_parser';
import { Visitor } from '../visitor';

test('"visitExpression" captures all non-captured expressions', () => {
  const { ast } = getAstAndSyntaxErrors(`
    FROM index
      | STATS 1, "str", [true], a = b BY field
      | LIMIT 123
  `);
  const visitor = new Visitor()
    .on('visitExpression', (ctx) => {
      return '<EXPRESSION>';
    })
    .on('visitCommand', (ctx) => {
      const args = [...ctx.visitArguments()].join(', ');
      return `${ctx.name()}${args ? ` ${args}` : ''}`;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].join(' | ');
    });
  const text = visitor.visitQuery(ast);

  expect(text).toBe(
    'FROM <EXPRESSION> | STATS <EXPRESSION>, <EXPRESSION>, <EXPRESSION>, <EXPRESSION> | LIMIT <EXPRESSION>'
  );
});

test('"visitColumnExpression" takes over all column visits', () => {
  const { ast } = getAstAndSyntaxErrors(`
    FROM index | STATS a
  `);
  const visitor = new Visitor()
    .on('visitColumnExpression', (ctx) => {
      return '<COLUMN>';
    })
    .on('visitExpression', (ctx) => {
      return 'E';
    })
    .on('visitCommand', (ctx) => {
      const args = [...ctx.visitArguments()].join(', ');
      return `${ctx.name()}${args ? ` ${args}` : ''}`;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].join(' | ');
    });
  const text = visitor.visitQuery(ast);

  expect(text).toBe('FROM E | STATS <COLUMN>');
});

test('"visitSourceExpression" takes over all source visits', () => {
  const { ast } = getAstAndSyntaxErrors(`
    FROM index
      | STATS 1, "str", [true], a = b BY field
      | LIMIT 123
  `);
  const visitor = new Visitor()
    .on('visitSourceExpression', (ctx) => {
      return '<SOURCE>';
    })
    .on('visitExpression', (ctx) => {
      return 'E';
    })
    .on('visitCommand', (ctx) => {
      const args = [...ctx.visitArguments()].join(', ');
      return `${ctx.name()}${args ? ` ${args}` : ''}`;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].join(' | ');
    });
  const text = visitor.visitQuery(ast);

  expect(text).toBe('FROM <SOURCE> | STATS E, E, E, E | LIMIT E');
});

test('"visitFunctionCallExpression" takes over all literal visits', () => {
  const { ast } = getAstAndSyntaxErrors(`
    FROM index
      | STATS 1, "str", [true], a = b BY field
      | LIMIT 123
  `);
  const visitor = new Visitor()
    .on('visitFunctionCallExpression', (ctx) => {
      return '<FUNCTION>';
    })
    .on('visitExpression', (ctx) => {
      return 'E';
    })
    .on('visitCommand', (ctx) => {
      const args = [...ctx.visitArguments()].join(', ');
      return `${ctx.name()}${args ? ` ${args}` : ''}`;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].join(' | ');
    });
  const text = visitor.visitQuery(ast);

  expect(text).toBe('FROM E | STATS E, E, E, <FUNCTION> | LIMIT E');
});

test('"visitLiteral" takes over all literal visits', () => {
  const { ast } = getAstAndSyntaxErrors(`
    FROM index
      | STATS 1, "str", [true], a = b BY field
      | LIMIT 123
  `);
  const visitor = new Visitor()
    .on('visitLiteralExpression', (ctx) => {
      return '<LITERAL>';
    })
    .on('visitExpression', (ctx) => {
      return 'E';
    })
    .on('visitCommand', (ctx) => {
      const args = [...ctx.visitArguments()].join(', ');
      return `${ctx.name()}${args ? ` ${args}` : ''}`;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].join(' | ');
    });
  const text = visitor.visitQuery(ast);

  expect(text).toBe('FROM E | STATS <LITERAL>, <LITERAL>, E, E | LIMIT <LITERAL>');
});
