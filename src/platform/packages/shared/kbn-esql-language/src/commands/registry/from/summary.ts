/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esqlCommandRegistry } from '../../../..';
import type { ESQLCommandOption, ESQLCommand, ESQLAstQueryExpression } from '../../../types';
import type { ESQLCommandSummary, FieldSummary } from '../types';
import { isColumn, isOptionNode, isSubQuery } from '../../../ast';

function aggregateSummary(source: ESQLCommandSummary, target: ESQLCommandSummary) {
  source.newColumns?.forEach((col) => target.newColumns?.add(col));
  source.renamedColumnsPairs?.forEach((pair) => target.renamedColumnsPairs?.add(pair));
  source.metadataColumns?.forEach((col) => target.metadataColumns?.add(col));
  source.aggregates?.forEach((aggregate) => target.aggregates?.add(aggregate));
  source.grouping?.forEach((group) => target.grouping?.add(group));
}

export const summary = (command: ESQLCommand, query: string): ESQLCommandSummary => {
  const metadataOption = command.args.find(
    (arg) => isOptionNode(arg) && arg.name === 'metadata'
  ) as ESQLCommandOption | undefined;

  const metadataColumns = metadataOption
    ? new Set(metadataOption.args.filter(isColumn).map(({ name }) => name))
    : new Set<string>();

  // Check for subqueries in FROM command
  const subqueries = command.args.filter(isSubQuery);

  const allNewColumns = new Set<string>();
  const allRenamedColumnsPairs = new Set<[string, string]>();
  const allMetadataColumns = new Set(metadataColumns);
  const allAggregates = new Set<FieldSummary>();
  const allGroupings = new Set<FieldSummary>();

  for (const subquery of subqueries) {
    const subquerySummary = processSubquery(subquery.child, query);
    aggregateSummary(subquerySummary, {
      newColumns: allNewColumns,
      renamedColumnsPairs: allRenamedColumnsPairs,
      metadataColumns: allMetadataColumns,
      aggregates: allAggregates,
      grouping: allGroupings,
    });
  }

  return {
    newColumns: allNewColumns,
    renamedColumnsPairs: allRenamedColumnsPairs,
    metadataColumns: allMetadataColumns,
  };
};

function processSubquery(subquery: ESQLAstQueryExpression, query: string): ESQLCommandSummary {
  const allNewColumns = new Set<string>();
  const allRenamedColumnsPairs = new Set<[string, string]>();
  const allMetadataColumns = new Set<string>();
  const allAggregates = new Set<FieldSummary>();
  const allGroupings = new Set<FieldSummary>();

  for (const subCommand of subquery.commands) {
    const commandDef = esqlCommandRegistry.getCommandByName(subCommand.name);

    if (commandDef?.methods.summary) {
      const commandSummary = commandDef.methods.summary(subCommand, query);
      aggregateSummary(commandSummary, {
        newColumns: allNewColumns,
        renamedColumnsPairs: allRenamedColumnsPairs,
        metadataColumns: allMetadataColumns,
        aggregates: allAggregates,
        grouping: allGroupings,
      });
    }
  }

  return {
    newColumns: allNewColumns,
    renamedColumnsPairs: allRenamedColumnsPairs,
    metadataColumns: allMetadataColumns,
    aggregates: allAggregates,
    grouping: allGroupings,
  };
}
