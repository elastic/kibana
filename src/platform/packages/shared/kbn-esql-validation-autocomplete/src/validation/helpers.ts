/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstQueryExpression } from '@kbn/esql-ast';
import { type ESQLCommand, type FunctionDefinition, Walker, Builder } from '@kbn/esql-ast';
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
export const getEnrichCommands = (commands: ESQLCommand[]): ESQLCommand[] =>
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
