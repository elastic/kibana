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

const toQueryCommand = (query: string, command: ESQLAstCommand): QueryCommand => ({
  name: command.name.toUpperCase(),
  // The parser's location includes its last character.
  text: query.slice(command.location.min, command.location.max + 1),
  start: command.location.min,
  end: command.location.max + 1,
});

/** The queries in parentheses of a command, such as the subqueries of a FROM. */
const readBranches = (query: string, command: ESQLAstCommand): QueryCommand[][] => {
  const args: ESQLAstItem[] = command.args;
  return args
    .filter(isParens)
    .flatMap(({ child }) =>
      'commands' in child ? [child.commands.map((inner) => toQueryCommand(query, inner))] : []
    )
    .filter((branch) => branch.length > 0);
};

/**
 * Splits an ES|QL query into its commands. A command with queries in parentheses, such as a FROM
 * with subqueries or a FORK, gets them as `branches`. The query is parsed, so pipes in strings and comments do not split it.
 */
export function splitQueryCommands(query: string): QueryCommand[] {
  return Parser.parse(query).root.commands.map((command) => {
    const queryCommand = toQueryCommand(query, command);
    const branches = readBranches(query, command);
    return branches.length > 0 ? { ...queryCommand, branches } : queryCommand;
  });
}
