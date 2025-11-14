/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression } from '@kbn/esql-ast';
import {
  type ESQLCommand,
  type FunctionDefinition,
  Walker,
  Builder,
  isSubQuery,
} from '@kbn/esql-ast';
import type { ESQLAstAllCommands } from '@kbn/esql-ast/src/types';
import { expandEvals } from '../shared/expand_evals';

/**
 * Returns the maximum and minimum number of parameters allowed by a function
 *
 * Used for too-many, too-few arguments validation
 */
export function getMaxMinNumberOfParams(definition: FunctionDefinition) {
  if (definition.signatures.length === 0) {
    return { min: 0, max: 0 };
  }

  let min = Infinity;
  let max = 0;
  definition.signatures.forEach(({ params, minParams }) => {
    min = Math.min(min, params.filter(({ optional }) => !optional).length);
    max = Math.max(max, minParams ? Infinity : params.length);
  });
  return { min, max };
}

/**
 * Collects all 'enrich' commands from a list of ESQL commands.
 * @param commands - The list of ESQL commands to search through.
 * This function traverses the provided ESQL commands and collects all commands with the name 'enrich'.
 * @returns {ESQLCommand[]} - An array of ESQLCommand objects that represent the 'enrich' commands found in the input.
 */
export const getEnrichCommands = (commands: ESQLAstAllCommands[]): ESQLCommand[] =>
  Walker.matchAll(commands, { type: 'command', name: 'enrich' }) as ESQLCommand[];

/**
 * Returns a list of subqueries to validate
 * @param rootCommands
 */
export function getSubqueriesToValidate(rootCommands: ESQLCommand[]) {
  const subsequences = [];
  const expandedCommands = expandEvals(rootCommands);
  for (let i = 0; i < expandedCommands.length; i++) {
    const command = expandedCommands[i];

    // every command within FORK's branches is its own subquery to be validated
    if (command.name.toLowerCase() === 'fork') {
      const branchSubqueries = getForkBranchSubqueries(command as ESQLCommand<'fork'>);
      for (const subquery of branchSubqueries) {
        subsequences.push([...expandedCommands.slice(0, i), ...subquery]);
      }
    }

    // every command within FROM's subqueries is its own subquery to be validated
    if (command.name.toLowerCase() === 'from') {
      const fromSubqueries = getFromSubqueries(command as ESQLCommand<'from'>);

      for (const subquery of fromSubqueries) {
        subsequences.push(subquery);
      }
    }

    subsequences.push(expandedCommands.slice(0, i + 1));
  }

  return subsequences.map((subsequence) => Builder.expression.query(subsequence));
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
function getForkBranchSubqueries(command: ESQLCommand<'fork'>): ESQLCommand[][] {
  const expanded: ESQLCommand[][] = [];
  const branches = command.args as ESQLAstQueryExpression[];
  for (let j = 0; j < branches.length; j++) {
    for (let k = 0; k < branches[j].commands.length; k++) {
      const partialQuery = branches[j].commands.slice(0, k + 1);
      expanded.push(partialQuery);
    }
  }
  return expanded;
}

/**
 * Expands a FROM command into flat subqueries for each command in each subquery.
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
 * @param command a FROM command
 * @returns an array of expanded subqueries
 */
function getFromSubqueries(command: ESQLCommand<'from'>): ESQLCommand[][] {
  return command.args.filter(isSubQuery).flatMap((arg) => {
    const subquery = arg.child;

    return subquery.commands.flatMap((currentCommand, k) => {
      const results: ESQLCommand[][] = [];

      // If this command is a FROM with nested subqueries, expand recursively first
      if (currentCommand.name.toLowerCase() === 'from') {
        results.push(...getFromSubqueries(currentCommand as ESQLCommand<'from'>));
      }

      // Always add the partial query (includes current command and all previous ones)
      results.push(subquery.commands.slice(0, k + 1));

      return results;
    });
  });
}
