/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../../../builder';
import type { ESQLAstQueryExpression, ESQLCommand } from '../../../types';
import * as generic from '../../generic';
import { Predicate } from '../../types';

/**
 * Lists all "LIMIT" commands in the query AST.
 *
 * @param ast The root AST node to search for "LIMIT" commands.
 * @returns A collection of "LIMIT" commands.
 */
export const list = (ast: ESQLAstQueryExpression): IterableIterator<ESQLCommand> => {
  return generic.commands.list(ast, (cmd) => cmd.name === 'limit');
};

/**
 * Retrieves the "LIMIT" command at the specified index in order of appearance.
 *
 * @param ast The root AST node to search for "LIMIT" commands.
 * @param index The index of the "LIMIT" command to retrieve.
 * @returns The "LIMIT" command at the specified index, if any.
 */
export const byIndex = (ast: ESQLAstQueryExpression, index: number): ESQLCommand | undefined => {
  return [...list(ast)][index];
};

/**
 * Finds the first "LIMIT" command that satisfies the provided predicate.
 *
 * @param ast The root AST node to search for "LIMIT" commands.
 * @param predicate The predicate function to apply to each "LIMIT" command.
 * @returns The first "LIMIT" command that satisfies the predicate, if any.
 */
export const find = (
  ast: ESQLAstQueryExpression,
  predicate: Predicate<ESQLCommand>
): ESQLCommand | undefined => {
  return [...list(ast)].find(predicate);
};

/**
 * Deletes the specified "LIMIT" command from the query AST.
 *
 * @param ast The root AST node to search for "LIMIT" commands.
 * @param index The index of the "LIMIT" command to remove.
 * @returns The removed "LIMIT" command, if any.
 */
export const remove = (ast: ESQLAstQueryExpression, index: number = 0): ESQLCommand | undefined => {
  const command = generic.commands.findByName(ast, 'limit', index);

  if (!command) {
    return;
  }

  const success = !!generic.commands.remove(ast, command);

  if (!success) {
    return;
  }

  return command;
};

/**
 * Sets the value of the specified "LIMIT" command. If `indexOrPredicate` is not
 * specified will update the first "LIMIT" command found, if any.
 *
 * @param ast The root AST node to search for "LIMIT" commands.
 * @param value The new value to set.
 * @param indexOrPredicate The index of the "LIMIT" command to update, or a
 *     predicate function.
 * @returns The updated "LIMIT" command, if any.
 */
export const set = (
  ast: ESQLAstQueryExpression,
  value: number,
  indexOrPredicate: number | Predicate<ESQLCommand> = 0
): ESQLCommand | undefined => {
  const node =
    typeof indexOrPredicate === 'number'
      ? byIndex(ast, indexOrPredicate)
      : find(ast, indexOrPredicate);

  if (!node) {
    return;
  }

  const literal = Builder.expression.literal.numeric({ literalType: 'integer', value });

  node.args = [literal];

  return node;
};

/**
 * Updates the value of the specified "LIMIT" command. If the "LIMIT" command
 * is not found, a new one will be created and appended to the query AST.
 *
 * @param ast The root AST node to search for "LIMIT" commands.
 * @param value The new value to set.
 * @param indexOrPredicate The index of the "LIMIT" command to update, or a
 *     predicate function.
 * @returns The updated or newly created "LIMIT" command.
 */
export const upsert = (
  ast: ESQLAstQueryExpression,
  value: number,
  indexOrPredicate: number | Predicate<ESQLCommand> = 0
): ESQLCommand => {
  const node = set(ast, value, indexOrPredicate);

  if (node) {
    return node;
  }

  const literal = Builder.expression.literal.numeric({ literalType: 'integer', value });
  const command = Builder.command({
    name: 'limit',
    args: [literal],
  });

  generic.commands.append(ast, command);

  return command;
};
