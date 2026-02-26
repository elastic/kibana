/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../../composer/query';
import { Visitor } from '../visitor';

test('"visitCommand" captures all non-captured commands', () => {
  const { ast } = EsqlQuery.fromSrc(`
    FROM index
      | STATS 1, "str", [true], a = b BY field
      | LIMIT 123
  `);
  const visitor = new Visitor()
    .on('visitStatsCommand', (ctx) => {
      return '<STATS>';
    })
    .on('visitCommand', (ctx) => {
      return `${ctx.name()}`;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].join(' | ');
    });
  const text = visitor.visitQuery(ast);

  expect(text).toBe('FROM | <STATS> | LIMIT');
});

test('can visit JOIN command', () => {
  const { ast } = EsqlQuery.fromSrc(`
    FROM index
      | STATS 1, "str", [true], a = b BY field
      | RIGHT JOIN abc ON xyz
      | LIMIT 123
  `);
  const visitor = new Visitor()
    .on('visitJoinCommand', (ctx) => {
      return `JOIN[type = ${ctx.node.commandType}]`;
    })
    .on('visitCommand', (ctx) => {
      return `${ctx.name()}`;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].join(' | ');
    });
  const text = visitor.visitQuery(ast);

  expect(text).toBe('FROM | STATS | JOIN[type = right] | LIMIT');
});

test('can visit JOIN command arguments', () => {
  const { ast } = EsqlQuery.fromSrc(`
    FROM index
      | STATS 1, "str", [true], a = b BY field
      | RIGHT JOIN abc ON xyz
      | LIMIT 123
  `);
  const visitor = new Visitor()
    .on('visitFunctionCallExpression', (ctx) => {
      if (ctx.node.subtype === 'binary-expression') {
        return ctx.node.name;
      } else {
        return null;
      }
    })
    .on('visitExpression', (ctx) => {
      return null;
    })
    .on('visitJoinCommand', (ctx) => {
      return [...ctx.visitArgs()];
    })
    .on('visitCommand', (ctx) => {
      return null;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()];
    });
  const list = visitor.visitQuery(ast).flat().filter(Boolean);

  expect(list).toMatchObject([]);
});

test('can visit JOIN ON option', () => {
  const { ast } = EsqlQuery.fromSrc(`
    FROM index
      | STATS 1, "str", [true], a = b BY field
      | RIGHT JOIN abc ON xyz
      | LIMIT 123
  `);
  const visitor = new Visitor()
    .on('visitColumnExpression', (ctx) => {
      return ctx.node.name;
    })
    .on('visitExpression', (ctx) => {
      return null;
    })
    .on('visitCommandOption', (ctx) => {
      return [...ctx.visitArguments()].flat();
    })
    .on('visitJoinCommand', (ctx) => {
      return [...ctx.visitOptions()].flat();
    })
    .on('visitCommand', (ctx) => {
      return null;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].flat();
    });
  const list = visitor.visitQuery(ast).flat().filter(Boolean);

  expect(list).toMatchObject(['xyz']);
});

test('can visit CHANGE_POINT command', () => {
  const { ast } = EsqlQuery.fromSrc(`
    FROM k8s
      | STATS count=COUNT() BY @timestamp=BUCKET(@timestamp, 1 MINUTE)
      | CHANGE_POINT count ON @timestamp AS type, pvalue
      | LIMIT 123
  `);
  const visitor = new Visitor()
    .on('visitExpression', (ctx) => {
      return null;
    })
    .on('visitChangePointCommand', (ctx) => {
      return 'CHANGE_POINT';
    })
    .on('visitCommand', (ctx) => {
      return null;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].flat();
    });
  const list = visitor.visitQuery(ast).flat().filter(Boolean);

  expect(list).toEqual(['CHANGE_POINT']);
});

test('can visit RERANK command', () => {
  const { ast } = EsqlQuery.fromSrc(`
    FROM movies
      | RERANK "star wars" ON title=X(title, 2), description=X(description, 1.5) WITH {"inferenceId":"rerankerInferenceId", "scoreColumn":"rerank_score"}
      | LIMIT 123
  `);

  const visitor = new Visitor()
    .on('visitLiteralExpression', (ctx) => {
      if (ctx.node.literalType === 'keyword') {
        return ctx.node.value;
      }
      return null;
    })
    .on('visitMapExpression', (ctx) => {
      return [...ctx.visitEntries(null)].flat();
    })
    .on('visitMapEntryExpression', (ctx) => {
      return [ctx.visitKey(null), ctx.visitValue(null)];
    })
    .on('visitFunctionCallExpression', (ctx) => {
      if (ctx.node.subtype === 'binary-expression' && ctx.node.name === '=') {
        const results = ['FIELD_ASSIGNMENT'];
        results.push(...[...ctx.visitArguments(null)].flat());
        return results;
      }

      if (ctx.node.name === 'x') {
        return 'X';
      }

      return null;
    })
    .on('visitExpression', () => {
      return null;
    })
    .on('visitCommandOption', (ctx) => {
      if (ctx.node.name === 'on') {
        return [...ctx.visitArguments()].flat();
      }

      if (ctx.node.name === 'with') {
        return [...ctx.visitArguments()].flat();
      }

      return null;
    })
    .on('visitRerankCommand', (ctx) => {
      return [...ctx.visitOptions()].flat();
    })
    .on('visitCommand', () => {
      return null;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].flat();
    });
  const list = visitor.visitQuery(ast).flat().filter(Boolean);

  expect(list.filter((item) => item === 'FIELD_ASSIGNMENT')).toHaveLength(2);
  expect(list.filter((item) => item === 'X')).toHaveLength(2);

  expect(list).toContain('"inferenceId"');
  expect(list).toContain('"rerankerInferenceId"');
  expect(list).toContain('"scoreColumn"');
  expect(list).toContain('"rerank_score"');
});

test('can visit COMPLETION command', () => {
  const { ast } = EsqlQuery.fromSrc(`
    FROM index
      | COMPLETION "test" WITH inferenceId
  `);
  const visitor = new Visitor()
    .on('visitExpression', (ctx) => {
      return null;
    })
    .on('visitCompletionCommand', (ctx) => {
      return 'COMPLETION';
    })
    .on('visitCommand', (ctx) => {
      return null;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].flat();
    });
  const list = visitor.visitQuery(ast).flat().filter(Boolean);

  expect(list).toEqual(['COMPLETION']);
});

test('can visit MMR command', () => {
  const { ast } = EsqlQuery.fromSrc(`
    FROM movies
      | MMR [0.5, 0.4, 0.3, 0.2]::dense_vector ON genre LIMIT 10 WITH { "lambda": 0.5 }
  `);
  const visitor = new Visitor()
    .on('visitLiteralExpression', (ctx) => {
      return ctx.node.value;
    })
    .on('visitMapExpression', (ctx) => {
      return [...ctx.visitEntries(null)].flat();
    })
    .on('visitMapEntryExpression', (ctx) => {
      return [ctx.visitKey(null), ctx.visitValue(null)];
    })
    .on('visitListLiteralExpression', (ctx) => {
      return [...ctx.visitElements(null)].flat();
    })
    .on('visitInlineCastExpression', (ctx) => {
      return [ctx.node.castType, ctx.visitValue(null)];
    })
    .on('visitColumnExpression', (ctx) => {
      return ctx.node.name;
    })
    .on('visitCommandOption', (ctx) => {
      return [...ctx.visitArguments(null)].flat();
    })
    .on('visitMmrCommand', (ctx) => {
      return [...ctx.visitArgs(null), ...ctx.visitOptions()].flat();
    })
    .on('visitExpression', () => {
      return null;
    })
    .on('visitCommand', () => {
      return null;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].flat();
    });
  const list = visitor.visitQuery(ast).flat().filter(Boolean);

  expect(list).toContain('dense_vector');
  expect(list).toContain(0.5);
  expect(list).toContain(0.4);
  expect(list).toContain(0.3);
  expect(list).toContain(0.2);
  expect(list).toContain('genre');
  expect(list).toContain(10);
  expect(list).toContain('"lambda"');
  expect(list).toContain(0.5);
});

test('can visit FROM command with complex subqueries', () => {
  const { ast } = EsqlQuery.fromSrc(`
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
    .on('visitParensExpression', () => {
      return 'SUBQUERY';
    })
    .on('visitExpression', () => {
      return null;
    })
    .on('visitFromCommand', (ctx) => {
      return [...ctx.visitArguments()];
    })
    .on('visitCommand', (ctx) => {
      return null;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].flat();
    });
  const list = visitor.visitQuery(ast).flat().filter(Boolean);

  expect(list).toEqual(['SUBQUERY', 'SUBQUERY']);
});
