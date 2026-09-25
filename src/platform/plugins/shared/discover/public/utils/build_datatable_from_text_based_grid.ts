/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_TABLE_TYPE } from '@kbn/data-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DataTableColumnsMeta } from '@kbn/unified-data-table';

/**
 * Rebuilds an ES|QL Datatable from grid rows and `getTextBasedColumnsMeta` output.
 * Column ids are the ES|QL column names (id === name for text-based results).
 */
export const buildDatatableFromTextBasedGrid = ({
  rows,
  columnsMeta,
}: {
  rows: DataTableRecord[];
  columnsMeta: DataTableColumnsMeta | undefined;
}): Datatable | undefined => {
  if (!columnsMeta) {
    return undefined;
  }

  const columns = Object.entries(columnsMeta).map(([name, meta]) => ({
    id: name,
    name,
    meta,
  }));

  if (!columns.length) {
    return undefined;
  }

  return {
    type: 'datatable',
    columns,
    rows: rows.map((row) => row.raw),
    meta: { type: ESQL_TABLE_TYPE },
  };
};
