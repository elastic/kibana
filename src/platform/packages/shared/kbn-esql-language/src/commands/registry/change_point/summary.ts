/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstChangePointCommand, ESQLCommand } from '../../../types';
import type { ESQLCommandSummary } from '../types';
import { LeafPrinter } from '../../../pretty_print/leaf_printer';

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const { target } = command as ESQLAstChangePointCommand;

  const newColumns: string[] = [];
  if (target?.type) {
    newColumns.push(LeafPrinter.column(target.type));
  } else {
    newColumns.push('type');
  }

  if (target?.pvalue) {
    newColumns.push(LeafPrinter.column(target.pvalue));
  } else {
    newColumns.push('pvalue');
  }

  return { newColumns: new Set(newColumns) };
};
