/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Column, DataSource } from '@kbn/data-source';
import type { DataTableColumnsMeta } from '../types';

/** The ES|QL columns of a result: an `EsqlSource`, or the deprecated `columnsMeta` adapted to it. */
export type EsqlColumnLookup = Pick<DataSource, 'getColumn' | 'getColumns'>;

/**
 * The ES|QL columns to render with: those of an ES|QL `dataSource`, else of the deprecated
 * `columnsMeta`. Undefined for index-pattern data, which renders from the DataView alone.
 */
export const getEsqlColumnLookup = ({
  dataSource,
  columnsMeta,
}: {
  dataSource?: DataSource;
  columnsMeta?: DataTableColumnsMeta;
}): EsqlColumnLookup | undefined => {
  if (dataSource?.kind === 'esql') {
    return dataSource;
  }
  if (!columnsMeta) {
    return undefined;
  }

  const columns = Object.entries(columnsMeta).map(
    ([name, { type, esType, isComputedColumn }]): Column => ({
      name,
      type: type as Column['type'],
      esType,
      source: isComputedColumn ? 'esql-result' : 'index',
    })
  );
  const columnsByName = new Map(columns.map((column) => [column.name, column]));

  return {
    getColumns: () => columns,
    getColumn: (name: string) => columnsByName.get(name),
  };
};

/**
 * The deprecated `columnsMeta` still given to extension points that read it: built from an ES|QL
 * `dataSource`, else the `columnsMeta` passed in.
 * @deprecated Read the columns from the data source instead.
 */
export const toDataTableColumnsMeta = ({
  dataSource,
  columnsMeta,
}: {
  dataSource?: DataSource;
  columnsMeta?: DataTableColumnsMeta;
}): DataTableColumnsMeta | undefined =>
  dataSource?.kind === 'esql'
    ? Object.fromEntries(
        dataSource.getColumns().map(({ name, type, esType, source }) => [
          name,
          {
            type: type as DataTableColumnsMeta[string]['type'],
            esType,
            isComputedColumn: source === 'esql-result',
          },
        ])
      )
    : columnsMeta;
