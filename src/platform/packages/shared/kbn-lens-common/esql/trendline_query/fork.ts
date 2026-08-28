/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BasicPrettyPrinter,
  isOptionNode,
  isFunctionExpression,
  isAssignment,
  isColumn,
  isParens,
  isQuery,
} from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';

/** Returns the command lists of each FORK branch (subqueries in parens). */
const getForkBranches = (forkCommand: ESQLCommand): ESQLCommand[][] =>
  forkCommand.args
    .filter(isParens)
    .map((paren) =>
      isQuery(paren.child)
        ? paren.child.commands.filter((c): c is ESQLCommand => c.type === 'command')
        : []
    );

/**
 * Returns true when the command list contains a STATS command, including
 * STATS commands nested inside FORK branches.
 */
export const commandsHaveStats = (commands: ESQLCommand[]): boolean =>
  commands.some(
    (command) =>
      command.name === 'stats' ||
      (command.name === 'fork' && getForkBranches(command).some(commandsHaveStats))
  );

/** Returns the result column names produced by a STATS command's aggregations. */
const getStatsResultColumns = (statsCommand: ESQLCommand): string[] => {
  const columns: string[] = [];
  for (const arg of statsCommand.args) {
    if (Array.isArray(arg) || isOptionNode(arg)) continue;
    if (isAssignment(arg) && isColumn(arg.args[0])) {
      columns.push(arg.args[0].name);
    } else if (isFunctionExpression(arg) || isColumn(arg)) {
      columns.push(BasicPrettyPrinter.expression(arg));
    }
  }
  return columns;
};

/**
 * Selects the FORK branch to derive the trendline from: the first branch whose
 * STATS produces one of the requested metric columns, otherwise the first
 * branch containing a STATS command, otherwise the first branch.
 */
const selectForkBranch = (
  branches: ESQLCommand[][],
  metricFields?: string[]
): ESQLCommand[] | undefined => {
  if (metricFields && metricFields.length > 0) {
    const match = branches.find((branch) =>
      branch.some(
        (command) =>
          command.name === 'stats' &&
          getStatsResultColumns(command).some((column) => metricFields.includes(column))
      )
    );
    if (match) return match;
  }
  return branches.find((branch) => branch.some((c) => c.name === 'stats')) ?? branches[0];
};

/**
 * Replaces a top-level FORK command with the commands of a single selected
 * branch so the trendline rewrite operates on source columns that are in
 * scope. After FORK, only branch output columns (plus the synthetic `_fork`
 * discriminator) are available, so time bucketing cannot be appended to the
 * whole query; instead the branch that produces the metric column is inlined.
 *
 * Mutates `commands` in place. References to the synthetic `_fork` column in
 * later KEEP/DROP commands are removed since the column no longer exists.
 */
export const flattenForkCommands = (commands: ESQLCommand[], metricFields?: string[]): void => {
  const forkIndex = commands.findIndex((command) => command.name === 'fork');
  if (forkIndex === -1) return;

  const branch = selectForkBranch(getForkBranches(commands[forkIndex]), metricFields) ?? [];
  commands.splice(forkIndex, 1, ...branch);

  for (let i = commands.length - 1; i >= forkIndex + branch.length; i--) {
    const command = commands[i];
    if (command.name !== 'keep' && command.name !== 'drop') continue;
    command.args = command.args.filter((arg) => !(isColumn(arg) && arg.name === '_fork'));
    if (command.args.length === 0) {
      commands.splice(i, 1);
    }
  }
};
