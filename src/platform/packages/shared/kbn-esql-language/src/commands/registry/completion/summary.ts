/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstCompletionCommand, ESQLCommand } from '../../../types';
import type { ESQLCommandSummary } from '../types';
import { LeafPrinter } from '../../../pretty_print/leaf_printer';

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const { targetField } = command as ESQLAstCompletionCommand;

  const newColumns: string[] = [];
  if (targetField) {
    newColumns.push(LeafPrinter.column(targetField));
  } else {
    newColumns.push('completion');
  }

  return { newColumns: new Set(newColumns) };
};
