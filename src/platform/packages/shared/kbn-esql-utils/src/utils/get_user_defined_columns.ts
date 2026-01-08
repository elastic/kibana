/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esqlCommandRegistry, Parser, type ESQLCommandSummary } from '@kbn/esql-language';

export function getAllUserDefinedColumnNames(query: string): ESQLCommandSummary {
  const { root } = Parser.parseQuery(query);

  const allNewColumns = new Set<string>();
  const allRenamedColumnsPairs = new Set<[string, string]>();
  const allMetadataColumns = new Set<string>();

  for (const command of root.commands) {
    const commandDef = esqlCommandRegistry.getCommandByName(command.name);

    if (commandDef?.methods.summary) {
      const summary = commandDef.methods.summary(command, query);

      if (summary.newColumns) {
        summary.newColumns.forEach((col) => allNewColumns.add(col));
      }

      if (summary.renamedColumnsPairs) {
        summary.renamedColumnsPairs.forEach((pair) => allRenamedColumnsPairs.add(pair));
      }

      if (summary.metadataColumns) {
        summary.metadataColumns.forEach((col) => allMetadataColumns.add(col));
      }
    }
  }

  return {
    newColumns: allNewColumns,
    renamedColumnsPairs: allRenamedColumnsPairs,
    metadataColumns: allMetadataColumns,
  };
}
