/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esqlCommandRegistry } from '../../../..';
import type { ESQLCommand, ESQLAstForkCommand } from '../../../types';
import type { ESQLCommandSummary, FieldSummary } from '../types';

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const forkCommand = command as ESQLAstForkCommand;
  const branches = forkCommand.args.map((parens) => parens.child);

  const allNewColumns = new Set<string>(['_fork']); // FORK always adds _fork column
  const allRenamedColumnsPairs = new Set<[string, string]>();
  const allMetadataColumns = new Set<string>();
  const allAggregates = new Set<FieldSummary>();
  const allGroupings = new Set<FieldSummary>();

  for (const branch of branches) {
    for (const branchCommand of branch.commands) {
      const commandDef = esqlCommandRegistry.getCommandByName(branchCommand.name);

      if (commandDef?.methods.summary) {
        const branchSummary = commandDef.methods.summary(branchCommand, query);

        if (branchSummary.newColumns) {
          branchSummary.newColumns.forEach((col) => allNewColumns.add(col));
        }

        if (branchSummary.renamedColumnsPairs) {
          branchSummary.renamedColumnsPairs.forEach((pair) => allRenamedColumnsPairs.add(pair));
        }

        if (branchSummary.metadataColumns) {
          branchSummary.metadataColumns.forEach((col) => allMetadataColumns.add(col));
        }

        if (branchSummary.aggregates) {
          branchSummary.aggregates.forEach((aggregate) => allAggregates.add(aggregate));
        }

        if (branchSummary.grouping) {
          branchSummary.grouping.forEach((group) => allGroupings.add(group));
        }
      }
    }
  }

  return {
    newColumns: allNewColumns,
    renamedColumnsPairs: allRenamedColumnsPairs,
    metadataColumns: allMetadataColumns,
    aggregates: allAggregates,
    grouping: allGroupings,
  };
};
