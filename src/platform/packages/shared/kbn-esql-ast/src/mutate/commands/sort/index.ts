/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../../../builder';
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
 * This "template" allows the developer to easily specify a new sort expression
 * AST node, for example:
 *
 * ```ts
 * // as a simple string
 * 'column_name'
 *
 * // column with nested fields
 * ['column_name', 'nested_field']
 *
 * // as an object with additional options
 * { parts: 'column_name', order: 'ASC', nulls: 'NULLS FIRST' }
 * { parts: ['column_name', 'nested_field'], order: 'DESC', nulls: 'NULLS LAST' }
 * ```
 */
export type NewSortExpressionTemplate =
  | string
  | string[]
  | {
      parts: string | string[];
      order?: ESQLOrderExpression['order'];
      nulls?: ESQLOrderExpression['nulls'];
    };

const createSortExpression = (
  template: string | string[] | NewSortExpressionTemplate
): SortExpression => {
  const parts: string[] =
    typeof template === 'string'
      ? [template]
      : Array.isArray(template)
      ? template
      : typeof template.parts === 'string'
      ? [template.parts]
      : template.parts;
  const identifiers = parts.map((part) => Builder.identifier({ name: part }));
  const column = Builder.expression.column({
    args: identifiers,
  });

  if (typeof template === 'string' || Array.isArray(template)) {
    return column;
  }

  const order = Builder.expression.order(column, {
    order: template.order ?? '',
    nulls: template.nulls ?? '',
  });

  return order;
};

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

/**
 * Returns the Nth SORT command found in the query.
 *
 * @param ast The root of the AST.
 * @param index The index (N) of the sort command to return.
 * @returns The sort command found in the AST, if any.
 */
export const getCommand = (
  ast: ESQLAstQueryExpression,
  index: number = 0
): ESQLCommand | undefined => {
  for (const command of listCommands(ast, index)) {
    return command;
  }
};

/**
 * Returns an iterator for all sort expressions (columns and order expressions)
 * in the query. You can specify the `skip` parameter to skip a given number of
 * expressions.
 *
 * @param ast The root of the AST.
 * @param skip Number of sort expressions to skip.
 * @returns Iterator through sort expressions (columns and order expressions).
 */
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

/**
 * Finds the Nts sort expression that matches the predicate.
 *
 * @param ast The root of the AST.
 * @param predicate A function that returns true if the sort expression matches
 *     the predicate.
 * @param index The index of the sort expression to return. If not specified,
 *     the first sort expression that matches the predicate will be returned.
 * @returns The sort expressions and sort command 2-tuple that matches the
 *     predicate, if any.
 */
export const findByPredicate = (
  ast: ESQLAstQueryExpression,
  predicate: Predicate<[sortExpression: SortExpression, sortCommand: ESQLCommand]>,
  index?: number
): [sortExpression: SortExpression, sortCommand: ESQLCommand] | undefined => {
  return util.findByPredicate(list(ast, index), predicate);
};

/**
 * Finds the Nth sort expression that matches the sort expression by column
 * name. The `parts` argument allows to specify an array of nested field names.
 *
 * @param ast The root of the AST.
 * @param parts A string or an array of strings representing the column name.
 * @returns The sort expressions and sort command 2-tuple that matches the
 *     predicate, if any.
 */
export const find = (
  ast: ESQLAstQueryExpression,
  parts: string | string[],
  index: number = 0
): [sortExpression: SortExpression, sortCommand: ESQLCommand] | undefined => {
  const arrParts = typeof parts === 'string' ? [parts] : parts;

  return findByPredicate(ast, ([node]) => {
    let isMatch = false;
    if (node.type === 'column') {
      isMatch = util.cmpArr(
        node.args.map((arg) => (arg.type === 'identifier' ? arg.name : '')),
        arrParts
      );
    } else if (node.type === 'order') {
      const columnParts = (node.args[0] as ESQLColumn)?.args;

      if (Array.isArray(columnParts)) {
        isMatch = util.cmpArr(
          columnParts.map((arg) => (arg.type === 'identifier' ? arg.name : '')),
          arrParts
        );
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

/**
 * Removes the Nth sort expression that matches the sort expression by column
 * name. The `parts` argument allows to specify an array of nested field names.
 *
 * @param ast The root of the AST.
 * @param parts A string or an array of strings representing the column name.
 * @param index The index of the sort expression to remove.
 * @returns The sort expressions and sort command 2-tuple that was removed, if any.
 */
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
  const cmd = generic.commands.args.remove(ast, node);

  if (cmd) {
    if (!cmd.args.length) {
      generic.commands.remove(ast, cmd);
    }
  }

  return cmd ? tuple : undefined;
};

/**
 * Inserts a new sort expression into the specified SORT command at the
 * specified argument position.
 *
 * @param sortCommand The SORT command to insert the new sort expression into.
 * @param template The sort expression template.
 * @param index Argument position in the command argument list.
 * @returns The inserted sort expression.
 */
export const insertIntoCommand = (
  sortCommand: ESQLCommand,
  template: NewSortExpressionTemplate,
  index?: number
): SortExpression => {
  const expression = createSortExpression(template);

  generic.commands.args.insert(sortCommand, expression, index);

  return expression;
};

/**
 * Creates a new sort expression node and inserts it into the specified SORT
 * command at the specified argument position. If not sort command is found, a
 * new one is created and appended to the end of the query.
 *
 * @param ast The root AST node.
 * @param parts ES|QL column name parts.
 * @param index The new column name position in command argument list.
 * @param sortCommandIndex The index of the SORT command in the AST. E.g. 0 is the
 *     first SORT command in the AST.
 * @returns The inserted column AST node.
 */
export const insertExpression = (
  ast: ESQLAstQueryExpression,
  template: NewSortExpressionTemplate,
  index: number = -1,
  sortCommandIndex: number = 0
): SortExpression => {
  let command: ESQLCommand | undefined = getCommand(ast, sortCommandIndex);

  if (!command) {
    command = Builder.command({ name: 'sort' });
    generic.commands.append(ast, command);
  }

  return insertIntoCommand(command, template, index);
};

/**
 * Inserts a new SORT command with a single sort expression as its sole argument.
 * You can specify the position to insert the command at.
 *
 * @param ast The root of the AST.
 * @param template The sort expression template.
 * @param index The position to insert the sort expression at.
 * @returns The inserted sort expression and the command it was inserted into.
 */
export const insertCommand = (
  ast: ESQLAstQueryExpression,
  template: NewSortExpressionTemplate,
  index: number = -1
): [ESQLCommand, SortExpression] => {
  const expression = createSortExpression(template);
  const command = Builder.command({ name: 'sort', args: [expression] });

  generic.commands.insert(ast, command, index);

  return [command, expression];
};
