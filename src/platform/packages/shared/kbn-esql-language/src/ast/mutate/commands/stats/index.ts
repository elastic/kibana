/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression, ESQLCommand } from '../../../../types';
import * as generic from '../../generic';

/**
 * Lists all "STATS" commands in the query AST.
 *
 * @param ast The root AST node to search for "STATS" commands.
 * @returns A collection of "STATS" commands.
 */
export const list = (ast: ESQLAstQueryExpression): IterableIterator<ESQLCommand> => {
  return generic.commands.list(ast, (cmd) => cmd.name === 'stats');
};

/**
 * Retrieves the "STATS" command at the specified index in order of appearance.
 *
 * @param ast The root AST node to search for "STATS" commands.
 * @param index The index of the "STATS" command to retrieve.
 * @returns The "STATS" command at the specified index, if any.
 */
export const byIndex = (ast: ESQLAstQueryExpression, index: number): ESQLCommand | undefined => {
  return [...list(ast)][index];
};
