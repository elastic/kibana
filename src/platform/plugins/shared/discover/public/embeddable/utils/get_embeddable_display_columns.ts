/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';
import type { DataTableColumnsMeta } from '@kbn/unified-data-table';
import type { DefaultAppStateColumn } from '../../context_awareness';
import { getResolvedProfileColumns } from '../../context_awareness/utils/get_resolved_profile_columns';
import { getEsqlDefaultColumns } from '../../utils/get_esql_default_columns';

export const getEmbeddableDisplayColumns = ({
  autoApplyDiscoverColumnDefaults,
  persistedColumns,
  profileColumns,
  defaultColumnsFromSettings,
  dataView,
  isEsql,
  esql,
  columnsMeta,
}: {
  autoApplyDiscoverColumnDefaults: boolean;
  persistedColumns: string[] | undefined;
  profileColumns?: DefaultAppStateColumn[];
  defaultColumnsFromSettings: string[];
  dataView: DataView;
  isEsql: boolean;
  esql?: string;
  columnsMeta: DataTableColumnsMeta | undefined;
}): {
  columns: string[];
  grid: DiscoverGridSettings | undefined;
} => {
  if (!autoApplyDiscoverColumnDefaults) {
    return { columns: persistedColumns ?? [], grid: undefined };
  }

  if (isEsql && !columnsMeta) {
    return { columns: persistedColumns ?? [], grid: undefined };
  }

  const esqlQueryColumns = isEsql
    ? Object.keys(columnsMeta ?? {}).map((name) => ({ name }))
    : undefined;

  const profileResolved = getResolvedProfileColumns({
    profileColumns,
    dataView,
    esqlQueryColumns,
  });

  if (persistedColumns && persistedColumns.length > 0) {
    const persistedNames = new Set(persistedColumns);
    const profileGridColumns = Object.fromEntries(
      Object.entries(profileResolved.grid?.columns ?? {}).filter(([name]) =>
        persistedNames.has(name)
      )
    );

    return {
      columns: persistedColumns,
      grid: Object.keys(profileGridColumns).length ? { columns: profileGridColumns } : undefined,
    };
  }

  if (profileResolved.columns.length) {
    return profileResolved;
  }

  if (isEsql && esql) {
    const esqlDefaults = getEsqlDefaultColumns({
      esql,
      responseColumns: columnsMeta ? Object.keys(columnsMeta) : undefined,
    });

    if (esqlDefaults.length) {
      return { columns: esqlDefaults, grid: undefined };
    }
  }

  return getResolvedProfileColumns({
    fallbackColumns: defaultColumnsFromSettings,
    dataView,
    esqlQueryColumns,
  });
};
