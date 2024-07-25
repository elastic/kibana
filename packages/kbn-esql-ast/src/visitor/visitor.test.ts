/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAstAndSyntaxErrors } from '../ast_parser';
import { Visitor } from './visitor';

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
