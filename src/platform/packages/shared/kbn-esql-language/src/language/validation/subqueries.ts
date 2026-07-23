/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder, isBinaryExpression, isSubQuery, Walker } from '@elastic/esql';
import type {
  ESQLAstAllCommands,
  ESQLAstForkCommand,
  ESQLAstHeaderCommand,
  ESQLAstQueryExpression,
  ESQLCommand,
} from '@elastic/esql/types';
import { inOperators } from '../../commands/definitions/all_operators';
import { expandEvals } from '../shared/expand_evals';

const COMMANDS_WITH_SUBQUERIES = new Set(['from', 'where']);

/**
 * Returns a list of subqueries to validate
 * @param rootCommands
 */
export function getSubqueriesToValidate(
  rootCommands: ESQLCommand[],
  headerCommands: ESQLAstHeaderCommand[]
) {
  const subsequences = [];
  const expandedCommands = expandEvals(rootCommands);
  for (let i = 0; i < expandedCommands.length; i++) {
    const command = expandedCommands[i];

    // every command within FORK's branches is its own subquery to be validated
    if (command.name.toLowerCase() === 'fork') {
      const branchSubqueries = getForkBranchSubqueries(command as ESQLAstForkCommand);
      for (const subquery of branchSubqueries) {
        subsequences.push([...expandedCommands.slice(0, i), ...subquery]);
      }
    }

    const commandName = command.name.toLowerCase();
    if (COMMANDS_WITH_SUBQUERIES.has(commandName)) {
      const subqueries = getSubqueries(command).flatMap(getCommandPrefixesForQuery);
      subsequences.push(...subqueries);
    }

    subsequences.push(expandedCommands.slice(0, i + 1));
  }

  return subsequences.map((subsequence) =>
    Builder.expression.query(subsequence, undefined, headerCommands)
  );
}

/**
 * Expands a FORK command into flat subqueries for each command in each branch.
 *
 * E.g. FORK (EVAL 1 | LIMIT 10) (RENAME foo AS bar | DROP lolz)
 *
 * becomes [`EVAL 1`, `EVAL 1 | LIMIT 10`, `RENAME foo AS bar`, `RENAME foo AS bar | DROP lolz`]
 *
 * @param command a FORK command
 * @returns an array of expanded subqueries
 */
function getForkBranchSubqueries(command: ESQLAstForkCommand): ESQLCommand[][] {
  const expanded: ESQLCommand[][] = [];
  const branches = command.args.map((parens) => parens.child);

  for (let j = 0; j < branches.length; j++) {
    for (let k = 0; k < branches[j].commands.length; k++) {
      const partialQuery = branches[j].commands.slice(0, k + 1);
      expanded.push(partialQuery);
    }
  }
  return expanded;
}

/**
 * Expands a nested query into flat subqueries for each command in the query.
 *
 * E.g. FROM index1, (FROM index2 | WHERE x > 10), (FROM index3, (FROM index4) | KEEP a)
 *
 * becomes [
 *   [FROM index2],
 *   [FROM index2 | WHERE x > 10],
 *   [FROM index4],
 *   [FROM index3, (FROM index4)],
 *   [FROM index3, (FROM index4) | KEEP a]
 * ]
 *
 * WHERE IN subqueries use the same expansion.
 */
function getCommandPrefixesForQuery(subquery: ESQLAstQueryExpression): ESQLCommand[][] {
  return subquery.commands.flatMap((currentCommand, k) => {
    const results: ESQLCommand[][] = [];
    const nestedSubqueries = getSubqueries(currentCommand).flatMap(getCommandPrefixesForQuery);
    results.push(...nestedSubqueries);

    // Always add the partial query (includes current command and all previous ones)
    results.push(subquery.commands.slice(0, k + 1));

    return results;
  });
}

function getSubqueries(command: ESQLAstAllCommands): ESQLAstQueryExpression[] {
  return [...getFromSubqueries(command), ...getInSubqueries(command)];
}

function getFromSubqueries(command: ESQLAstAllCommands): ESQLAstQueryExpression[] {
  if (command.name.toLowerCase() !== 'from') {
    return [];
  }

  return (command as ESQLCommand<'from'>).args.filter(isSubQuery).map(({ child }) => child);
}

function getInSubqueries(command: ESQLAstAllCommands): ESQLAstQueryExpression[] {
  const results: ESQLAstQueryExpression[] = [];

  Walker.walk(command, {
    visitFunction: (node) => {
      if (!isBinaryExpression(node) || !inOperators.some(({ name }) => name === node.name)) {
        return;
      }

      const rightArg = node.args[1];

      if (!Array.isArray(rightArg) && isSubQuery(rightArg)) {
        results.push(rightArg.child);
      }
    },
    visitParens: (node, _parent, walker) => {
      if (isSubQuery(node)) {
        walker.skipChildren();
      }
    },
  });

  return results;
}
