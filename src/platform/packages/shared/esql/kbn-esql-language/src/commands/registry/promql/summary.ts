/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstPromqlCommand, ESQLCommand } from '@elastic/esql/types';
import type { ESQLCommandSummary } from '../..';
import { getPromqlOutputMetadata, getPromqlUserDefinedColumn, PromqlParamName } from './utils';

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const promqlCommand = command as ESQLAstPromqlCommand;
  const newColumns: string[] = [];

  // A query produces a "step" column in the output.
  if (promqlCommand.query) {
    newColumns.push(PromqlParamName.Step);
  }

  const { expression, breakdownLabels } = getPromqlOutputMetadata(promqlCommand);

  const userDefinedColumn = getPromqlUserDefinedColumn(promqlCommand);
  if (userDefinedColumn) {
    newColumns.push(userDefinedColumn.name);
  } else if (expression && expression.type !== 'selector') {
    newColumns.push(query.substring(expression.location.min, expression.location.max + 1));
  }

  for (const label of breakdownLabels) {
    newColumns.push(label);
  }

  return { newColumns: new Set(newColumns) };
};
