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
 * The command's location starts at its keyword, past the pipe and past any comment between
 * the two, so the pipe is looked for in the gap after the command before it.
 */
export function commandLeadStart(
  query: string,
  root: ESQLAstQueryExpression,
  command: ESQLCommand
): number {
  const index = root.commands.indexOf(command);
  const previous = index > 0 ? root.commands[index - 1] : undefined;
  const gapStart = previous ? previous.location.max + 1 : 0;
  const pipe = findPipe(query, gapStart, command.location.min);
  let start = pipe === -1 ? command.location.min : pipe;
  while (start > gapStart && /\s/.test(query[start - 1])) start -= 1;
  return start;
}

/** The index of the first pipe between `from` and `to` that is not inside a comment. */
function findPipe(query: string, from: number, to: number): number {
  let i = from;
  while (i < to) {
    if (query.startsWith('//', i)) {
      const end = query.indexOf('\n', i);
      i = end === -1 ? to : end + 1;
    } else if (query.startsWith('/*', i)) {
      const end = query.indexOf('*/', i + 2);
      i = end === -1 ? to : end + 2;
    } else if (query[i] === '|') {
      return i;
    } else {
      i += 1;
    }
  }
  return -1;
}
