/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// import { Builder } from '../../../builder';
import {
  ESQLAstQueryExpression,
  ESQLColumn,
  ESQLCommand,
  ESQLOrderExpression,
} from '../../../types';
import { Visitor } from '../../../visitor';
import { Predicate } from '../../types';
import * as util from '../../util';
import * as generic from '../../generic';

export type SortExpression = ESQLOrderExpression | ESQLColumn;

/**
 * Iterates through all sort commands starting from the beginning of the query.
 * You can specify the `skip` parameter to skip a given number of sort commands.
 *
 * @param ast The root of the AST.
 * @param skip Number of sort commands to skip.
 * @returns Iterator through all sort commands.
 */
export const listCommands = (
  ast: ESQLAstQueryExpression,
  skip: number = 0
): IterableIterator<ESQLCommand> => {
  return new Visitor()
    .on('visitSortCommand', function* (ctx): IterableIterator<ESQLCommand> {
      if (skip) {
        skip--;
      } else {
        yield ctx.node;
      }
    })
    .on('visitCommand', function* (): IterableIterator<ESQLCommand> {})
    .on('visitQuery', function* (ctx): IterableIterator<ESQLCommand> {
      for (const command of ctx.visitCommands()) {
        yield* command;
      }
    })
    .visitQuery(ast);
};

export const list = (
  ast: ESQLAstQueryExpression,
  skip: number = 0
): IterableIterator<[sortExpression: SortExpression, sortCommand: ESQLCommand]> => {
  return new Visitor()
    .on('visitSortCommand', function* (ctx): IterableIterator<[SortExpression, ESQLCommand]> {
      for (const argument of ctx.arguments()) {
        if (argument.type === 'order' || argument.type === 'column') {
          if (skip) {
            skip--;
          } else {
            yield [argument, ctx.node];
          }
        }
      }
    })
    .on('visitCommand', function* (): IterableIterator<[SortExpression, ESQLCommand]> {})
    .on('visitQuery', function* (ctx): IterableIterator<[SortExpression, ESQLCommand]> {
      for (const command of ctx.visitCommands()) {
        yield* command;
      }
    })
    .visitQuery(ast);
};

export const findByPredicate = (
  ast: ESQLAstQueryExpression,
  predicate: Predicate<[sortExpression: SortExpression, sortCommand: ESQLCommand]>,
  index?: number
): [sortExpression: SortExpression, sortCommand: ESQLCommand] | undefined => {
  return util.findByPredicate(list(ast, index), predicate);
};

export const find = (
  ast: ESQLAstQueryExpression,
  parts: string | string[],
  index: number = 0
): [sortExpression: SortExpression, sortCommand: ESQLCommand] | undefined => {
  const arrParts = typeof parts === 'string' ? [parts] : parts;

  return findByPredicate(ast, ([node]) => {
    let isMatch = false;
    if (node.type === 'column') {
      isMatch = util.cmpArr(node.parts, arrParts);
    } else if (node.type === 'order') {
      const columnParts = (node.args[0] as ESQLColumn)?.parts;

      if (Array.isArray(columnParts)) {
        isMatch = util.cmpArr(columnParts, arrParts);
      }
    }

    if (isMatch) {
      index--;
      if (index < 0) {
        return true;
      }
    }

    return false;
  });
};

export const remove = (
  ast: ESQLAstQueryExpression,
  parts: string | string[],
  index?: number
): [sortExpression: SortExpression, sortCommand: ESQLCommand] | undefined => {
  const tuple = find(ast, parts, index);

  if (!tuple) {
    return undefined;
  }

  const [node] = tuple;
  const cmd = generic.removeCommandArgument(ast, node);

  if (cmd) {
    if (!cmd.args.length) {
      generic.removeCommand(ast, cmd);
    }
  }

  return cmd ? tuple : undefined;
};

// /**
//  *
//  * ```
//  * FROM index | SORT a, b | LIMIT 10 | SORT c, d
//  * ```
//  *
//  * @param ast
//  * @param parts
//  * @param index
//  * @returns
//  */
// export const insert = (
//   ast: ESQLAstQueryExpression,
//   parts: string | string[],
//   index?: number
// ): ESQLSource | undefined => {
//   const command = generic.findCommandByName(ast, 'from');

//   if (!command) {
//     return;
//   }

//   const source = Builder.expression.indexSource(indexName, clusterName);

//   if (index === -1) {
//     generic.appendCommandArgument(command, source);
//   } else {
//     command.args.splice(index, 0, source);
//   }

//   return source;
// };
