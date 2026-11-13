/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstCommand, ESQLAstQueryExpression } from '@elastic/esql/types';
import { Parser } from '@elastic/esql';
import {
  esqlCommandRegistry,
  getNamedSubqueries,
  getNamedSubqueriesAvailableTo,
  type ESQLCommandSummary,
  type ESQLCommandSummaryContext,
  type FieldSummary,
  type NamedSubquery,
} from '@kbn/esql-language';
import { parseEsqlCached } from './parse_esql_cached';

function processCommand(
  command: ESQLAstCommand,
  query: string,
  context: ESQLCommandSummaryContext,
  targetSets: {
    newColumns: Set<string>;
    renamedColumnsPairs: Set<[string, string]>;
    metadataColumns: Set<string>;
    aggregates: Set<FieldSummary>;
    grouping: Set<FieldSummary>;
  }
): void {
  const commandDef = esqlCommandRegistry.getCommandByName(command.name);

  if (commandDef?.methods.summary) {
    const summary = commandDef.methods.summary(command, query, context);

    if (summary.newColumns) {
      summary.newColumns.forEach((col) => targetSets.newColumns.add(col));
    }

    if (summary.renamedColumnsPairs) {
      summary.renamedColumnsPairs.forEach((pair) => targetSets.renamedColumnsPairs.add(pair));
    }

    if (summary.metadataColumns) {
      summary.metadataColumns.forEach((col) => targetSets.metadataColumns.add(col));
    }

    if (summary.aggregates) {
      summary.aggregates.forEach((aggregate) => targetSets.aggregates.add(aggregate));
    }

    if (summary.grouping) {
      summary.grouping.forEach((group) => targetSets.grouping.add(group));
    }
  }
}

/**
 * Summarizes commands from an already parsed ES|QL query.
 * @param commands Parsed commands to summarize.
 * @param query The ES|QL query string those commands came from.
 * @param context The LETs that the sources of those commands can point to.
 */
export function getQuerySummaryFromCommands(
  commands: readonly ESQLAstCommand[],
  query: string,
  context: ESQLCommandSummaryContext
): ESQLCommandSummary {
  const allNewColumns = new Set<string>();
  const allRenamedColumnsPairs = new Set<[string, string]>();
  const allMetadataColumns = new Set<string>();
  const allAggregates = new Set<FieldSummary>();
  const allGroupings = new Set<FieldSummary>();

  for (const command of commands) {
    processCommand(command, query, context, {
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
    aggregates: allAggregates,
    grouping: allGroupings,
  };
}

/**
 * With `LET a = (...); FROM a`, the summary of FROM must also include the summary of the LET body.
 * This builds the context that makes it possible: `summarizeBinding` says how to summarize a body,
 * each LET is summarized only once, and its body only sees the LETs declared before it.
 */
export const createNamedSubquerySummaryContext = (
  namedSubqueries: readonly NamedSubquery[],
  summarizeBinding: (
    commands: readonly ESQLAstCommand[],
    context: ESQLCommandSummaryContext
  ) => ESQLCommandSummary
): ESQLCommandSummaryContext => {
  const summaries = new Map<NamedSubquery, ESQLCommandSummary>();

  const createScope = (scope: readonly NamedSubquery[]): ESQLCommandSummaryContext => ({
    namedSubqueries: scope,
    getNamedSubquerySummary: (namedSubquery) => {
      const cached = summaries.get(namedSubquery);
      if (cached) {
        return cached;
      }

      const summary = summarizeBinding(
        namedSubquery.query.commands,
        createScope(getNamedSubqueriesAvailableTo(namedSubqueries, namedSubquery))
      );
      summaries.set(namedSubquery, summary);
      return summary;
    },
  });

  return createScope(namedSubqueries);
};

/** Builds the summary context of a parsed query from the LETs in its header. */
export const createQuerySummaryContext = (
  { header }: ESQLAstQueryExpression,
  query: string
): ESQLCommandSummaryContext =>
  createNamedSubquerySummaryContext(getNamedSubqueries(header), (commands, bindingContext) =>
    getQuerySummaryFromCommands(commands, query, bindingContext)
  );

/**
 * Analyzes the provided ES|QL query and returns a summary of new columns,
 * renamed columns, and metadata columns introduced by the commands in the query,
 * plus the ones coming from the LETs that its sources use.
 * @param query The ES|QL query string to analyze.
 * @returns An object containing sets of new columns, renamed column pairs, metadata columns, aggregates, and grouping.
 */
export function getQuerySummary(query: string): ESQLCommandSummary {
  const { root } = parseEsqlCached(query);
  return getQuerySummaryFromCommands(root.commands, query, createQuerySummaryContext(root, query));
}

/**
 * Resolves a column to its index field when a DSL filter is valid.
 * A column is filterable when the query did not introduce it, or when a RENAME,
 * bare EVAL, or `STATS BY alias = field` maps it back to a source field.
 */
export function resolveSourceField(
  fieldName: string,
  summary: ESQLCommandSummary,
  renameMap: ReadonlyMap<string, string>
): { isSourceFieldFilterable: boolean; sourceField: string } {
  const isSourceFieldFilterable = !summary.newColumns.has(fieldName) || renameMap.has(fieldName);
  return {
    isSourceFieldFilterable,
    sourceField: renameMap.get(fieldName) ?? fieldName,
  };
}

/**
 * Returns an array of summaries, one for each command of the specified type.
 * If there are multiple commands of the same type, each will have its own summary in the array.
 */
export function getQuerySummaryPerCommandType(
  query: string,
  commandType: string
): ESQLCommandSummary[] {
  const { root } = Parser.parseQuery(query);
  const context = createQuerySummaryContext(root, query);
  const summaries: ESQLCommandSummary[] = [];

  for (const command of root.commands) {
    if (command.name !== commandType) {
      continue;
    }

    const allNewColumns = new Set<string>();
    const allRenamedColumnsPairs = new Set<[string, string]>();
    const allMetadataColumns = new Set<string>();
    const allAggregates = new Set<FieldSummary>();
    const allGroupings = new Set<FieldSummary>();

    processCommand(command, query, context, {
      newColumns: allNewColumns,
      renamedColumnsPairs: allRenamedColumnsPairs,
      metadataColumns: allMetadataColumns,
      aggregates: allAggregates,
      grouping: allGroupings,
    });

    summaries.push({
      newColumns: allNewColumns,
      renamedColumnsPairs: allRenamedColumnsPairs,
      metadataColumns: allMetadataColumns,
      aggregates: allAggregates,
      grouping: allGroupings,
    });
  }

  return summaries;
}

/**
 * Analyzes a specific command within an ES|QL query and returns a summary of it.
 */
export function getSummaryPerCommand(
  query: string,
  command: ESQLAstCommand,
  context: ESQLCommandSummaryContext
): ESQLCommandSummary {
  const allNewColumns = new Set<string>();
  const allRenamedColumnsPairs = new Set<[string, string]>();
  const allMetadataColumns = new Set<string>();
  const allAggregates = new Set<FieldSummary>();
  const allGroupings = new Set<FieldSummary>();

  processCommand(command, query, context, {
    newColumns: allNewColumns,
    renamedColumnsPairs: allRenamedColumnsPairs,
    metadataColumns: allMetadataColumns,
    aggregates: allAggregates,
    grouping: allGroupings,
  });

  return {
    newColumns: allNewColumns,
    renamedColumnsPairs: allRenamedColumnsPairs,
    metadataColumns: allMetadataColumns,
    aggregates: allAggregates,
    grouping: allGroupings,
  };
}

/**
 * Checks if a given field name is a computed column (generated by the ES|QL query),
 * excluding original index fields.
 * @param fieldName The name of the field to check.
 * @param summary The ES|QL query summary.
 * @returns True if the field is computed by the query (not from index), false otherwise.
 */
export function isComputedColumn(fieldName: string, summary: ESQLCommandSummary): boolean {
  return summary.newColumns.has(fieldName) || Boolean(summary.metadataColumns?.has(fieldName));
}
