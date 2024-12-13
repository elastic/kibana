/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker } from '../../../walker';
import { ESQLAstQueryExpression, ESQLColumn, ESQLCommandOption } from '../../../types';
import { Visitor } from '../../../visitor';
import { cmpArr, findByPredicate } from '../../util';
import * as generic from '../../generic';
import { Builder } from '../../../builder';
import type { Predicate } from '../../types';

/**
 * Returns all METADATA field AST nodes and their corresponding parent command
 * option nodes.
 *
 * @param ast The root AST node to search for metadata fields.
 * @returns A collection of [column, option] pairs for each metadata field found.
 */
export const list = (
  ast: ESQLAstQueryExpression
): IterableIterator<[ESQLColumn, ESQLCommandOption]> => {
  type ReturnExpression = IterableIterator<ESQLColumn>;
  type ReturnCommand = IterableIterator<[ESQLColumn, ESQLCommandOption]>;

  return new Visitor()
    .on('visitExpression', function* (): ReturnExpression {})
    .on('visitColumnExpression', function* (ctx): ReturnExpression {
      yield ctx.node;
    })
    .on('visitCommandOption', function* (ctx): ReturnCommand {
      if (ctx.node.name !== 'metadata') {
        return;
      }
      for (const args of ctx.visitArguments()) {
        for (const column of args) {
          yield [column, ctx.node];
        }
      }
    })
    .on('visitFromCommand', function* (ctx): ReturnCommand {
      for (const options of ctx.visitOptions()) {
        yield* options;
      }
    })
    .on('visitCommand', function* (): ReturnCommand {})
    .on('visitQuery', function* (ctx): ReturnCommand {
      for (const command of ctx.visitCommands()) {
        yield* command;
      }
    })
    .visitQuery(ast);
};

/**
 * Find a METADATA field by its name or parts.
 *
 * @param ast The root AST node to search for metadata fields.
 * @param fieldName The name or parts of the field to find.
 * @returns A 2-tuple containing the column and the option it was found in, or
 *     `undefined` if the field was not found.
 */
export const find = (
  ast: ESQLAstQueryExpression,
  fieldName: string | string[]
): [ESQLColumn, ESQLCommandOption] | undefined => {
  if (typeof fieldName === 'string') {
    fieldName = [fieldName];
  }

  const predicate: Predicate<[ESQLColumn, unknown]> = ([field]) =>
    cmpArr(
      field.args.map((arg) => (arg.type === 'identifier' ? arg.name : '')),
      fieldName as string[]
    );

  return findByPredicate(list(ast), predicate);
};

/**
 * Removes the first found METADATA field that satisfies the predicate.
 *
 * @param ast The root AST node to search for metadata fields.
 * @param predicate The predicate function to filter fields.
 * @returns The removed column and option, if any.
 */
export const removeByPredicate = (
  ast: ESQLAstQueryExpression,
  predicate: Predicate<ESQLColumn>
): [column: ESQLColumn, option: ESQLCommandOption] | undefined => {
  const tuple = findByPredicate(list(ast), ([field]) => predicate(field));

  if (!tuple) {
    return;
  }

  const [column, option] = tuple;
  const index = option.args.indexOf(column);

  if (index === -1) {
    return;
  }

  option.args.splice(index, 1);

  if (option.args.length === 0) {
    generic.commands.options.remove(ast, option);
  }

  return tuple;
};

/**
 * Removes the first METADATA field that matches the given name and returns
 * a 2-tuple (the column and the option it was removed from).
 *
 * @param ast The root AST node to search for metadata fields.
 * @param fieldName The name or parts of the field to remove.
 * @returns The removed column and option, if any.
 */
export const remove = (
  ast: ESQLAstQueryExpression,
  fieldName: string | string[]
): [column: ESQLColumn, option: ESQLCommandOption] | undefined => {
  if (typeof fieldName === 'string') {
    fieldName = [fieldName];
  }

  return removeByPredicate(ast, (field) =>
    cmpArr(
      field.args.map((arg) => (arg.type === 'identifier' ? arg.name : '')),
      fieldName as string[]
    )
  );
};

/**
 * Insert into a specific position or append a `METADATA` field to the `FROM`
 * command.
 *
 * @param ast The root AST node.
 * @param fieldName Field name or parts as an array, e.g. `['a', 'b']`.
 * @param index Position to insert the field at. If `-1` or not specified, the
 *     field will be appended.
 * @returns If the field was successfully inserted, returns a 2-tuple containing
 *     the column and the option it was inserted into. Otherwise, returns
 *    `undefined`.
 */
export const insert = (
  ast: ESQLAstQueryExpression,
  fieldName: string | string[],
  index: number = -1
): [column: ESQLColumn, option: ESQLCommandOption] | undefined => {
  let option = generic.commands.options.findByName(ast, 'from', 'metadata');

  if (!option) {
    const command = generic.commands.findByName(ast, 'from');

    if (!command) {
      return;
    }

    option = generic.commands.options.append(command, 'metadata');
  }

  const parts: string[] = typeof fieldName === 'string' ? [fieldName] : fieldName;
  const args = parts.map((part) => Builder.identifier({ name: part }));
  const column = Builder.expression.column({ args });

  if (index === -1) {
    option.args.push(column);
  } else {
    option.args.splice(index, 0, column);
  }

  return [column, option];
};

/**
 * The `.upsert()` method works like `.insert()`, but will not insert a field
 * if it already exists.
 *
 * @param ast The root AST node.
 * @param fieldName The field name or parts as an array, e.g. `['a', 'b']`.
 * @param index Position to insert the field at. If `-1` or not specified, the
 *     field will be appended.
 * @returns If the field was successfully inserted, returns a 2-tuple containing
 *     the column and the option it was inserted into. Otherwise, returns
 *    `undefined`.
 */
export const upsert = (
  ast: ESQLAstQueryExpression,
  fieldName: string | string[],
  index: number = -1
): [column: ESQLColumn, option: ESQLCommandOption] | undefined => {
  const option = generic.commands.options.findByName(ast, 'from', 'metadata');

  if (option) {
    const parts = Array.isArray(fieldName) ? fieldName : [fieldName];
    const existing = Walker.find(
      option,
      (node) =>
        node.type === 'column' &&
        cmpArr(
          node.args.map((arg) => (arg.type === 'identifier' ? arg.name : '')),
          parts
        )
    );
    if (existing) {
      return undefined;
    }
  }

  return insert(ast, fieldName, index);
};
