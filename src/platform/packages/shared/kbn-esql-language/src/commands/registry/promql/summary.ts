/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommandSummary } from '../..';
import type { ESQLAstPromqlCommand, ESQLCommand } from '../../../types';
import { PromqlParamName } from './utils';
import { isBinaryExpression, isIdentifier } from '../../../ast';

/** Returns true if PROMQL has the specified parameter */
const hasParam = (command: ESQLAstPromqlCommand, paramName: PromqlParamName): boolean => {
  if (!command.params) {
    return false;
  }
  return command.params.entries.some(
    (param) => isIdentifier(param.key) && param.key.name === paramName
  );
};

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const promqlCommand = command as ESQLAstPromqlCommand;
  const newColumns: string[] = [];

  // "step" or "buckets" param creates a step column in the output
  if (
    hasParam(promqlCommand, PromqlParamName.Step) ||
    hasParam(promqlCommand, PromqlParamName.Buckets)
  ) {
    newColumns.push(PromqlParamName.Step);
  }

  // col = query, left side of assignment is the name of the new column (label)
  if (isBinaryExpression(promqlCommand.query)) {
    if (isIdentifier(promqlCommand.query.args[0])) {
      newColumns.push(promqlCommand.query.args[0].name);
    }
  }

  // If no label is provided, the new column name is the query text
  // TODO: complete when we have the query node.

  // Collect columns derivated from the query, for instance by clauses. (Does "OR" generate new columns by merging query results?)
  // TODO: complete when we have the query node.

  return { newColumns: new Set(newColumns) };
};
