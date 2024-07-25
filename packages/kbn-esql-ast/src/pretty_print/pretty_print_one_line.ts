/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQLAstQueryNode, Visitor } from '../visitor';

export const prettyPrintOneLine = (ast: ESQLAstQueryNode) => {
  const visitor = new Visitor()
    .on('visitSource', (ctx) => {
      return ctx.node.name;
    })
    .on('visitColumn', (ctx) => {
      return ctx.node.name;
    })
    .on('visitFunctionCallExpression', (ctx) => {
      let args = '';
      for (const arg of ctx.visitArguments()) {
        args += (args ? ', ' : '') + arg;
      }
      return `${ctx.node.name.toUpperCase()}${args ? `(${args})` : ''}`;
    })
    .on('visitLiteralExpression', (ctx) => {
      return ctx.node.value;
    })
    .on('visitExpression', (ctx) => {
      return 'UNKNOWN_EXPRESSION';
    })
    .on('visitCommandOption', (ctx) => {
      let args = '';
      for (const arg of ctx.visitArguments()) {
        args += (args ? ', ' : '') + arg;
      }
      return ctx.node.name.toUpperCase() + (args ? ` ${args}` : '');
    })
    .on('visitCommand', (ctx) => {
      let args = '';
      for (const source of ctx.visitArguments()) {
        args += (args ? ', ' : '') + source;
      }
      return `${ctx.node.name.toUpperCase()}${args ? ` ${args}` : ''}`;
    })
    .on('visitFromCommand', (ctx) => {
      let sources = '';
      for (const source of ctx.visitSources()) {
        sources += (sources ? ', ' : '') + source;
      }
      let options = '';
      for (const option of ctx.visitOptions()) {
        options += ' ' + option;
      }
      return `FROM ${sources}${options}`;
    })
    .on('visitLimitCommand', (ctx) => {
      return `LIMIT ${ctx.numeric() ?? 0}`;
    })
    .on('visitQuery', (ctx) => {
      let text = '';
      for (const cmd of ctx.visitCommands()) {
        text += (text ? ' | ' : '') + cmd;
      }
      return text;
    });
  const text = visitor.visitQuery(ast);

  return text;
};
