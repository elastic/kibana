/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Walker } from '../../../walker';
import type {
  ESQLAstJoinCommand,
  ESQLAstQueryExpression,
  ESQLCommand,
  ESQLIdentifier,
} from '../../../types';
import * as generic from '../../generic';

/**
 * Lists all "JOIN" commands in the query AST.
 *
 * @param ast The root AST node to search for "JOIN" commands.
 * @returns A collection of "JOIN" commands.
 */
export const list = (ast: ESQLAstQueryExpression): IterableIterator<ESQLAstJoinCommand> => {
  return generic.commands.list(
    ast,
    (cmd) => cmd.name === 'join'
  ) as IterableIterator<ESQLAstJoinCommand>;
};

/**
 * Retrieves the "JOIN" command at the specified index in order of appearance.
 *
 * @param ast The root AST node to search for "JOIN" commands.
 * @param index The index of the "JOIN" command to retrieve.
 * @returns The "JOIN" command at the specified index, if any.
 */
export const byIndex = (ast: ESQLAstQueryExpression, index: number): ESQLCommand | undefined => {
  return [...list(ast)][index];
};

/**
 * Summarizes all JOIN commands in the query.
 *
 * @param query Query to summarize.
 * @returns Returns a list of summaries for all JOIN commands in the query in
 *     order of appearance.
 */
export const summarize = (query: ESQLAstQueryExpression): JoinCommandSummary[] => {
  const summaries: JoinCommandSummary[] = [];

  for (const command of list(query)) {
    const firstArg = command.args[0];
    const firstIdentifier = Walker.match(firstArg, {
      type: 'identifier',
    }) as ESQLIdentifier;
    const target: JoinCommandTarget = {
      index: firstIdentifier,
      // TODO: add support for `alias` field.
    };
    const summary: JoinCommandSummary = {
      target,
    };

    summaries.push(summary);
  }

  return summaries;
};

export interface JoinCommandSummary {
  target: JoinCommandTarget;
}

export interface JoinCommandTarget {
  index: ESQLIdentifier;
  alias?: ESQLIdentifier;
}
