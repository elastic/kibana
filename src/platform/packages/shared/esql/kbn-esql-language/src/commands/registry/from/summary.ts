/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCommandOption, ESQLCommand, ESQLAstQueryExpression } from '@elastic/esql/types';
import { isColumn, isOptionNode, isSource, isSubQuery } from '@elastic/esql';
import { esqlCommandRegistry } from '../../../..';
import { findNamedSubqueryForSource } from '../../definitions/utils/named_subqueries';
import type { ESQLCommandSummary, ESQLCommandSummaryContext, FieldSummary } from '../types';

function aggregateSummary(source: ESQLCommandSummary, target: ESQLCommandSummary) {
  source.newColumns?.forEach((col) => target.newColumns?.add(col));
  source.renamedColumnsPairs?.forEach((pair) => target.renamedColumnsPairs?.add(pair));
  source.metadataColumns?.forEach((col) => target.metadataColumns?.add(col));
  source.aggregates?.forEach((aggregate) => target.aggregates?.add(aggregate));
  source.grouping?.forEach((group) => target.grouping?.add(group));
}

export const summary = (
  command: ESQLCommand,
  query: string,
  context: ESQLCommandSummaryContext
): ESQLCommandSummary => {
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
  const target: ESQLCommandSummary = {
    newColumns: allNewColumns,
    renamedColumnsPairs: allRenamedColumnsPairs,
    metadataColumns: allMetadataColumns,
    aggregates: allAggregates,
    grouping: allGroupings,
  };

  for (const subquery of subqueries) {
    const subquerySummary = processSubquery(subquery.child, query, context);
    aggregateSummary(subquerySummary, target);
  }

  for (const source of command.args.filter(isSource)) {
    const namedSubquery = findNamedSubqueryForSource(source, context.namedSubqueries);

    if (namedSubquery) {
      aggregateSummary(context.getNamedSubquerySummary(namedSubquery), target);
    }
  }

  return {
    newColumns: allNewColumns,
    renamedColumnsPairs: allRenamedColumnsPairs,
    metadataColumns: allMetadataColumns,
  };
};

function processSubquery(
  subquery: ESQLAstQueryExpression,
  query: string,
  context: ESQLCommandSummaryContext
): ESQLCommandSummary {
  const allNewColumns = new Set<string>();
  const allRenamedColumnsPairs = new Set<[string, string]>();
  const allMetadataColumns = new Set<string>();
  const allAggregates = new Set<FieldSummary>();
  const allGroupings = new Set<FieldSummary>();

  for (const subCommand of subquery.commands) {
    const commandDef = esqlCommandRegistry.getCommandByName(subCommand.name);

    if (commandDef?.methods.summary) {
      const commandSummary = commandDef.methods.summary(subCommand, query, context);
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
