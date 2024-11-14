/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOptionNode } from '../../../../ast/util';
import {
  ESQLAstQueryExpression,
  ESQLCommand,
  ESQLProperNode,
  ESQLSingleAstItem,
} from '../../../../types';
import { Visitor } from '../../../../visitor';

export const insert = (
  command: ESQLCommand,
  expression: ESQLSingleAstItem,
  index: number = -1
): number => {
  if (expression.type === 'option') {
    command.args.push(expression);
    return command.args.length - 1;
  }

  let mainArgumentCount = command.args.findIndex((arg) => isOptionNode(arg));

  if (mainArgumentCount < 0) {
    mainArgumentCount = command.args.length;
  }
  if (index === -1) {
    index = mainArgumentCount;
  }
  if (index > mainArgumentCount) {
    index = mainArgumentCount;
  }

  command.args.splice(index, 0, expression);

  return mainArgumentCount + 1;
};

export const append = (command: ESQLCommand, expression: ESQLSingleAstItem): number => {
  return insert(command, expression, -1);
};

/**
 * Searches all command arguments in the query AST node and removes the node
 * from the command's arguments list.
 *
 * @param ast The root AST node to search for command arguments.
 * @param node The argument AST node to remove.
 * @returns Returns the command that the argument was removed from, if any.
 */
export const remove = (
  ast: ESQLAstQueryExpression,
  node: ESQLProperNode
): ESQLCommand | undefined => {
  return new Visitor()
    .on('visitCommand', (ctx): ESQLCommand | undefined => {
      const args = ctx.node.args;
      const length = args.length;

      for (let i = 0; i < length; i++) {
        if (args[i] === node) {
          args.splice(i, 1);
          return ctx.node;
        }
      }

      return undefined;
    })
    .on('visitQuery', (ctx): ESQLCommand | undefined => {
      for (const cmd of ctx.visitCommands()) {
        if (cmd) {
          return cmd;
        }
      }

      return undefined;
    })
    .visitQuery(ast);
};
