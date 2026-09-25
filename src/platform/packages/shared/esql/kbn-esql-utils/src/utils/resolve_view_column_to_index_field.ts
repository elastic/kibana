/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSubQuery, Parser } from '@elastic/esql';
import type { EsqlView } from '@kbn/esql-types';
import { buildRenameSourceFieldMap } from './build_rename_source_field_map';
import {
  getIndexPatternFromESQLQuery,
  splitIndexPatternSources,
} from './get_index_pattern_from_query';
import { getQuerySummaryFromCommands, resolveSourceField } from './get_query_summary';

/** Views nested deeper than this are not walked, so a cyclic definition cannot stall a click. */
const MAX_VIEW_DEPTH = 8;

/**
 * Same rule as the ES|QL datatable columns: a column is filterable when it is not
 * introduced by the query, or when a RENAME / bare EVAL / `STATS BY alias = field`
 * resolves it to a real source field.
 */
const filterableSourceField = (query: string, fieldName: string): string | undefined => {
  try {
    const { root } = Parser.parse(query);
    const fromHasSubquery = root.commands.some(
      (command) =>
        (command.name === 'from' || command.name === 'ts') && command.args.some(isSubQuery)
    );
    if (fromHasSubquery) {
      return undefined;
    }

    const summary = getQuerySummaryFromCommands(root.commands, query);
    const renameMap = summary.renamedColumnsPairs?.size ? buildRenameSourceFieldMap(query) : null;
    const { isSourceFieldFilterable, sourceField } = resolveSourceField(
      fieldName,
      summary,
      renameMap
    );
    return isSourceFieldFilterable ? sourceField : undefined;
  } catch {
    return undefined;
  }
};

const resolveThroughSources = (
  fieldName: string,
  indexPattern: string,
  viewsByName: ReadonlyMap<string, string>,
  depth: number,
  seen: ReadonlySet<string>
): string | undefined => {
  const sources = splitIndexPatternSources(indexPattern);
  if (!sources.length) {
    return undefined;
  }

  const viewSources = sources.filter((source) => viewsByName.has(source));
  // Remaining sources are indices, aliases, or patterns. The field survived view expansion.
  if (!viewSources.length) {
    return fieldName;
  }
  if (depth >= MAX_VIEW_DEPTH) {
    return undefined;
  }

  let resolved: string | undefined;
  for (const viewName of viewSources) {
    if (seen.has(viewName)) {
      return undefined;
    }
    const viewQuery = viewsByName.get(viewName);
    if (!viewQuery) {
      return undefined;
    }
    const sourceField = filterableSourceField(viewQuery, fieldName);
    if (!sourceField) {
      return undefined;
    }

    let innerPattern = '';
    try {
      innerPattern = getIndexPatternFromESQLQuery(viewQuery);
    } catch {
      return undefined;
    }

    const nextSeen = new Set(seen);
    nextSeen.add(viewName);
    const next = resolveThroughSources(sourceField, innerPattern, viewsByName, depth + 1, nextSeen);
    if (!next) {
      return undefined;
    }
    if (resolved !== undefined && resolved !== next) {
      return undefined;
    }
    resolved = next;
  }

  if (!resolved) {
    return undefined;
  }

  // An index listed next to a view only shares the filter when the view did not rename the field.
  if (viewSources.length !== sources.length && resolved !== fieldName) {
    return undefined;
  }

  return resolved;
};

/**
 * Maps a view output column to the underlying index field when a DSL filter is valid.
 * Returns undefined for aggregates, expressions, unresolved sources, and non-view patterns.
 */
export const resolveViewColumnToIndexField = (
  fieldName: string,
  indexPattern: string,
  views: readonly EsqlView[]
): string | undefined => {
  if (!fieldName || !indexPattern) {
    return undefined;
  }

  const viewsByName = new Map(views.map((view) => [view.name, view.query]));
  if (!splitIndexPatternSources(indexPattern).some((source) => viewsByName.has(source))) {
    return undefined;
  }

  return resolveThroughSources(fieldName, indexPattern, viewsByName, 0, new Set());
};
