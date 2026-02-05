/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { LeafPrinter } from '../../../pretty_print/leaf_printer';
import type { ESQLCommand, ESQLAstRerankCommand } from '../../../types';
import type { ESQLCommandSummary } from '../types';

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const { targetField } = command as ESQLAstRerankCommand;
  if (targetField) {
    return { newColumns: new Set([LeafPrinter.column(targetField)]) };
  }
  return { newColumns: new Set(['_score']) };
};
