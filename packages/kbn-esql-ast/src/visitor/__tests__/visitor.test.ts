/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAstAndSyntaxErrors } from '../../ast_parser';
import { CommandVisitorContext, WhereCommandVisitorContext } from '../contexts';
import { Visitor } from '../visitor';

test('can collect all command names in type safe way', () => {
  const visitor = new Visitor()
    .on('visitCommand', (ctx) => {
      return ctx.node.name;
    })
    .on('visitQuery', (ctx) => {
      const cmds = [];
      for (const cmd of ctx.visitCommands()) {
        cmds.push(cmd);
      }
      return cmds;
    });

  const { ast } = getAstAndSyntaxErrors('FROM index | LIMIT 123');
  const res = visitor.visitQuery(ast);

  expect(res).toEqual(['from', 'limit']);
});

test('can pass inputs to visitors', () => {
  const visitor = new Visitor()
    .on('visitCommand', (ctx, prefix: string) => {
      return prefix + ctx.node.name;
    })
    .on('visitQuery', (ctx) => {
      const cmds = [];
      for (const cmd of ctx.visitCommands('pfx:')) {
        cmds.push(cmd);
      }
      return cmds;
    });

  const { ast } = getAstAndSyntaxErrors('FROM index | LIMIT 123');
  const res = visitor.visitQuery(ast);

  expect(res).toEqual(['pfx:from', 'pfx:limit']);
});

test('can specify specific visitors for commands', () => {
  const { ast } = getAstAndSyntaxErrors(
    'FROM index | SORT asfd | WHERE 1 | ENRICH adsf | LIMIT 123'
  );
  const res = new Visitor()
    .on('visitWhereCommand', () => 'where')
    .on('visitSortCommand', () => 'sort')
    .on('visitEnrichCommand', () => 'very rich')
    .on('visitCommand', () => 'DEFAULT')
    .on('visitQuery', (ctx) => [...ctx.visitCommands()])
    .visitQuery(ast);

  expect(res).toEqual(['DEFAULT', 'sort', 'where', 'very rich', 'DEFAULT']);
});

test('a command can access parent query node', () => {
  const { ast } = getAstAndSyntaxErrors(
    'FROM index | SORT asfd | WHERE 1 | ENRICH adsf | LIMIT 123'
  );
  new Visitor()
    .on('visitWhereCommand', (ctx) => {
      if (ctx.parent!.node !== ast) {
        throw new Error('Expected parent to be query node');
      }
    })
    .on('visitCommand', (ctx) => {
      if (ctx.parent!.node !== ast) {
        throw new Error('Expected parent to be query node');
      }
    })
    .on('visitQuery', (ctx) => [...ctx.visitCommands()])
    .visitQuery(ast);
});

test('specific commands receive specific visitor contexts', () => {
  const { ast } = getAstAndSyntaxErrors(
    'FROM index | SORT asfd | WHERE 1 | ENRICH adsf | LIMIT 123'
  );

  new Visitor()
    .on('visitWhereCommand', (ctx) => {
      if (!(ctx instanceof WhereCommandVisitorContext)) {
        throw new Error('Expected WhereCommandVisitorContext');
      }
      if (!(ctx instanceof CommandVisitorContext)) {
        throw new Error('Expected WhereCommandVisitorContext');
      }
    })
    .on('visitCommand', (ctx) => {
      if (!(ctx instanceof CommandVisitorContext)) {
        throw new Error('Expected CommandVisitorContext');
      }
    })
    .on('visitQuery', (ctx) => [...ctx.visitCommands()])
    .visitQuery(ast);

  new Visitor()
    .on('visitCommand', (ctx) => {
      if (!(ctx instanceof CommandVisitorContext)) {
        throw new Error('Expected CommandVisitorContext');
      }
      if (ctx instanceof WhereCommandVisitorContext) {
        throw new Error('Did not expect WhereCommandVisitorContext');
      }
    })
    .on('visitQuery', (ctx) => [...ctx.visitCommands()])
    .visitQuery(ast);
});
