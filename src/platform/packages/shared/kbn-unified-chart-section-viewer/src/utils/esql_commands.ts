/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression, ESQLCommand } from '@elastic/esql/types';
import { BasicPrettyPrinter, Parser } from '@elastic/esql';

/**
 * The query as the ES|QL parser reads it, with the parentheses of the source kept: printed
 * back, an expression then matches its source text wherever the source was already in the
 * printer's shape, which is how the latency map recognises the clauses it wrote.
 */
export function parseEsqlQuery(query: string): ESQLAstQueryExpression | undefined {
  const { root, errors } = Parser.parse(query, { withParens: true });
  return errors.length > 0 ? undefined : root;
}

/** The top-level commands of a name: a command inside a FORK branch is not one of them. */
export const topLevelCommands = (root: ESQLAstQueryExpression, name: string): ESQLCommand[] =>
  root.commands.filter((command) => command.name === name);

/** The expression of a WHERE command as the printer writes it; a trailing comment is not part of it. */
export const whereExpression = (command: ESQLCommand): string | undefined => {
  const [expression] = command.args;
  return expression && !Array.isArray(expression)
    ? BasicPrettyPrinter.expression(expression)
    : undefined;
};

/**
 * Where a top-level command's lead starts in the query text: the pipe before it, and the
 * whitespace before that, so cutting or inserting there keeps the query's own line breaks.
 * The command's location starts at its keyword, past the pipe.
 */
export function commandLeadStart(query: string, command: ESQLCommand): number {
  let index = command.location.min;
  while (index > 0 && /\s/.test(query[index - 1])) index -= 1;
  if (query[index - 1] === '|') index -= 1;
  while (index > 0 && /\s/.test(query[index - 1])) index -= 1;
  return index;
}
