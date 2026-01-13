/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esqlCommandRegistry, Parser, type ESQLCommandSummary } from '@kbn/esql-language';

export function getQuerySummary(query: string): ESQLCommandSummary {
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

/**
 * Checks if a given field name belongs to the original index fields in the query,
 * excluding any new or metadata columns introduced by the query.
 * @param fieldName The name of the field to check.
 * @param query The ES|QL query string.
 * @returns True if the field belongs to the original index, false otherwise.
 */
export function isIndexField(fieldName: string, query: string): boolean {
  const summary = getQuerySummary(query);
  return !summary.newColumns.has(fieldName) && !summary?.metadataColumns?.has(fieldName);
}
