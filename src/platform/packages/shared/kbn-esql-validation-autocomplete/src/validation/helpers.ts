/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ESQLAst, type ESQLCommand, type FunctionDefinition, Walker } from '@kbn/esql-ast';
import type { ESQLPolicy } from '@kbn/esql-ast/src/commands_registry/types';

export function buildQueryForFieldsInPolicies(policies: ESQLPolicy[]) {
  return `from ${policies
    .flatMap(({ sourceIndices }) => sourceIndices)
    .join(', ')} | keep ${policies.flatMap(({ enrichFields }) => enrichFields).join(', ')}`;
}

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
