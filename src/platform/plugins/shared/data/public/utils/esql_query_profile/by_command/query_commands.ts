/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstCommand, ESQLAstItem, ESQLParens } from '@elastic/esql';
import { Parser } from '@elastic/esql';

export interface QueryCommand {
  /** The command name in upper case, such as STATS. */
  name: string;
  /** The command as written, from its name to its last token, without the comments around it. */
  text: string;
  /** Where the command starts in the query, as an index into the query string. */
  start: number;
  /** Where the command ends in the query, as an index just past its last character. */
  end: number;
  /**
   * The queries inside the parentheses of a FROM or FORK command, in the order they are written.
   * Each is a list of commands. Only one level is looked at.
   */
  branches?: QueryCommand[][];
}

const isParens = (item: ESQLAstItem): item is ESQLParens =>
  !Array.isArray(item) && item.type === 'parens';

/** Turns a position counted in characters, as the parser does, into an index of the string. */
type ToIndex = (position: number) => number;

const SURROGATE_PAIR = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;

/** The parser counts a character such as an emoji as one, while a string counts it as two. */
const createToIndex = (query: string): ToIndex => {
  if (!SURROGATE_PAIR.test(query)) {
    return (position) => position;
  }
  const indexes: number[] = [];
  let index = 0;
  for (const character of query) {
    indexes.push(index);
    index += character.length;
  }
  indexes.push(index);
  return (position) => indexes[position] ?? query.length;
};

const toQueryCommand = (query: string, toIndex: ToIndex, command: ESQLAstCommand): QueryCommand => {
  const start = toIndex(command.location.min);
  // The parser's location includes its last character.
  const end = toIndex(command.location.max + 1);
  return { name: command.name.toUpperCase(), text: query.slice(start, end), start, end };
};

/** The queries in parentheses of a command, such as the subqueries of a FROM. */
const readBranches = (
  query: string,
  toIndex: ToIndex,
  command: ESQLAstCommand
): QueryCommand[][] => {
  const args: ESQLAstItem[] = command.args;
  return args
    .filter(isParens)
    .flatMap(({ child }) =>
      'commands' in child
        ? [child.commands.map((inner) => toQueryCommand(query, toIndex, inner))]
        : []
    )
    .filter((branch) => branch.length > 0);
};

/**
 * Splits an ES|QL query into its commands. A command with queries in parentheses, such as a FROM
 * with subqueries or a FORK, gets them as `branches`. The query is parsed, so pipes in strings and
 * comments do not split it.
 */
export function splitQueryCommands(query: string): QueryCommand[] {
  const toIndex = createToIndex(query);
  return Parser.parse(query).root.commands.map((command) => {
    const queryCommand = toQueryCommand(query, toIndex, command);
    const branches = readBranches(query, toIndex, command);
    return branches.length > 0 ? { ...queryCommand, branches } : queryCommand;
  });
}
