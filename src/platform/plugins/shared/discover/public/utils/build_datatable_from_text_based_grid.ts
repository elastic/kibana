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
import type { EsqlSource } from '@kbn/data-source';

/**
 * Rebuilds an ES|QL Datatable from grid rows and the result columns of their source.
 */
export const buildDatatableFromTextBasedGrid = ({
  rows,
  resultDataSource,
}: {
  rows: DataTableRecord[];
  resultDataSource: EsqlSource | undefined;
}): Datatable | undefined => {
  const columns = [...(resultDataSource?.resultColumns ?? [])];

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
