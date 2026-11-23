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
  getUnmappedFieldsStrategy,
  type ESQLColumnData,
  type ESQLCommandSummary,
  type ESQLCommandSummaryContext,
  type FieldSummary,
  type IAdditionalFields,
  type NamedSubquery,
} from '@kbn/esql-language';
import { LRUCache } from 'lru-cache';
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

/** Builds a context that caches nested pipeline summaries within their visible LET scope. */
export const createQuerySummaryContext = (
  { header }: ESQLAstQueryExpression,
  query: string,
  summarizePipeline = getQuerySummaryFromCommands
): ESQLCommandSummaryContext => {
  const namedSubqueries = getNamedSubqueries(header);
  const summaries = new Map<ESQLAstQueryExpression, ESQLCommandSummary>();

  const createScope = (scope: readonly NamedSubquery[]): ESQLCommandSummaryContext => ({
    namedSubqueries: scope,
    getSubquerySummary: (subquery, visibleNamedSubqueries) => {
      const cached = summaries.get(subquery);
      if (cached) {
        return cached;
      }

      const summary = summarizePipeline(
        subquery.commands,
        query,
        createScope(visibleNamedSubqueries)
      );
      summaries.set(subquery, summary);
      return summary;
    },
  });

  return createScope(namedSubqueries);
};

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

// The columns depend only on the query, so they are reused while the query is the same.
// Like the parsed queries, the cache is bounded by the characters of the queries.
const computedColumnsCache = new LRUCache<string, ReadonlySet<string>>({
  max: 50,
  maxSize: 50_000,
  sizeCalculation: (_columns, query) => Math.max(1, query.length),
});

/**
 * Returns the columns that the query creates (EVAL, STATS, DISSECT, ...) and that are part of its output.
 * Each command knows the columns that it leaves (`columnsAfter`), so STATS, KEEP, DROP or RENAME are considered.
 * The fields of the sources are not asked for, so there are no requests and the index fields are not included,
 * except the ones that STATS groups by.
 * A query with syntax errors has no columns, Elasticsearch reports its errors when it runs.
 * @param query The ES|QL query.
 * @returns The names of the columns.
 */
export async function getComputedColumnsInOutput(query: string): Promise<ReadonlySet<string>> {
  const cached = computedColumnsCache.get(query);
  if (cached) {
    return cached;
  }

  const { root, errors } = parseEsqlCached(query);
  if (errors.length > 0) {
    return new Set();
  }

  const noFields = async () => [];
  const additionalFields: IAdditionalFields = {
    fromJoin: noFields,
    fromEnrich: noFields,
    fromFrom: noFields,
    fromPromql: noFields,
    namedSubqueries: getNamedSubqueries(root.header),
  };

  const unmappedFieldsStrategy = getUnmappedFieldsStrategy(root.header);
  let columns: ESQLColumnData[] = [];
  for (const command of root.commands) {
    const columnsAfter = esqlCommandRegistry.getCommandByName(command.name)?.methods.columnsAfter;
    if (columnsAfter) {
      columns = await columnsAfter(
        command,
        columns,
        query,
        additionalFields,
        unmappedFieldsStrategy
      );
    }
  }

  const computedColumns: ReadonlySet<string> = new Set(columns.map(({ name }) => name));
  computedColumnsCache.set(query, computedColumns);
  return computedColumns;
}
