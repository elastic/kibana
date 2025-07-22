/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EsqlQuery } from '../../query';
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
    FROM k8s
      | RERANK "test" ON field WITH id
      | LIMIT 123
  `);
  const visitor = new Visitor()
    .on('visitExpression', (ctx) => {
      return null;
    })
    .on('visitRerankCommand', (ctx) => {
      return 'RERANK';
    })
    .on('visitCommand', (ctx) => {
      return null;
    })
    .on('visitQuery', (ctx) => {
      return [...ctx.visitCommands()].flat();
    });
  const list = visitor.visitQuery(ast).flat().filter(Boolean);

  expect(list).toEqual(['RERANK']);
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
