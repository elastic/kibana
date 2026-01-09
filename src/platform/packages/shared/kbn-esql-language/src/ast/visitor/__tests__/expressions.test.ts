/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '../../../parser';
import { Visitor } from '../visitor';

test('"visitExpression" captures all non-captured expressions', () => {
  const { ast } = parse(`
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

test('can terminate walk early, does not visit all literals', () => {
  const numbers: number[] = [];
  const { ast } = parse(`
    FROM index
      | STATS 0, 1, 2, 3
      | LIMIT 123
  `);
  const result = new Visitor()
    .on('visitExpression', (ctx) => {
      return 0;
    })
    .on('visitLiteralExpression', (ctx) => {
      numbers.push(ctx.node.value as number);
      return ctx.node.value;
    })
    .on('visitCommand', (ctx) => {
      for (const res of ctx.visitArguments()) if (res) return res;
    })
    .on('visitQuery', (ctx) => {
      for (const res of ctx.visitCommands()) if (res) return res;
    })
    .visitQuery(ast);

  expect(result).toBe(1);
  expect(numbers).toEqual([0, 1]);
});

test('"visitColumnExpression" takes over all column visits', () => {
  const { ast } = parse(`
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
  const { ast } = parse(`
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
  const { ast } = parse(`
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

test('"visitMapExpression" takes over expression visiting', () => {
  const { ast } = parse(`
    ROW fn(1, {"a": 2})
  `);
  const visitor = new Visitor()
    .on('visitMapExpression', (ctx) => {
      return '<MAP>';
    })
    .on('visitFunctionCallExpression', (ctx) => {
      return `${ctx.node.name}(${[...ctx.visitArguments(undefined)].join(', ')})`;
    })
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

  expect(text).toBe('ROW fn(<EXPRESSION>, <MAP>)');
});

test('"visitMapEntryExpression" takes over expression visiting', () => {
  const { ast } = parse(`
    ROW fn(1, {"a": 2, "b": "3"})
  `);
  const visitor = new Visitor()
    .on('visitMapEntryExpression', (ctx) => {
      return '<ENTRY>';
    })
    .on('visitMapExpression', (ctx) => {
      return `{${[...ctx.visitArguments(undefined)].join(', ')}}`;
    })
    .on('visitFunctionCallExpression', (ctx) => {
      return `${ctx.node.name}(${[...ctx.visitArguments(undefined)].join(', ')})`;
    })
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

  expect(text).toBe('ROW fn(<EXPRESSION>, {<ENTRY>, <ENTRY>})');
});

test('"visitLiteral" takes over all literal visits', () => {
  const { ast } = parse(`
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

test('"visitExpression" does visit WHERE clause args', () => {
  const { ast } = parse(`
    FROM index
      | STATS 1 WHERE 2
      | LIMIT 123
  `);
  const visitor = new Visitor()
    .on('visitLiteralExpression', (ctx) => {
      return '<LITERAL>';
    })
    .on('visitFunctionCallExpression', (ctx) => {
      return `${ctx.node.name}(${[...ctx.visitArguments(undefined)].join(', ')})`;
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

  expect(text).toBe('FROM E | STATS where(<LITERAL>, <LITERAL>) | LIMIT <LITERAL>');
});

test('"visitExpression" does visit identifier nodes', () => {
  const { ast } = parse(`
    FROM index
      | RIGHT JOIN a ON c
  `);
  const expressions: string[] = [];
  new Visitor()
    .on('visitExpression', (ctx) => {
      expressions.push(ctx.node.name);
      for (const _ of ctx.visitArguments(undefined));
    })
    .on('visitCommand', (ctx) => {
      for (const _ of ctx.visitArguments());
    })
    .on('visitQuery', (ctx) => {
      for (const _ of ctx.visitCommands());
    })
    .visitQuery(ast);

  expect(expressions.sort()).toEqual(['a', 'index']);
});

test('"visitParensExpression" can traverse complex subqueries with processing', () => {
  const { ast } = parse(`
    FROM index1,
         (FROM index2
          | WHERE a > 10
          | EVAL b = a * 2
          | STATS cnt = COUNT(*) BY c
          | SORT cnt desc
          | LIMIT 10),
         index3,
         (FROM index4 | STATS count(*))
    | WHERE d > 10
    | STATS max = max(*) BY e
    | SORT max desc
  `);
  const visitor = new Visitor()
    .on('visitParensExpression', (ctx) => {
      const child = ctx.visitChild(undefined);
      return `PARENS(${child})`;
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

  expect(text).toBe(
    'FROM E, PARENS(FROM E | WHERE E | EVAL E | STATS E | SORT E | LIMIT E), E, PARENS(FROM E | STATS E) | WHERE E | STATS E | SORT E'
  );
});
