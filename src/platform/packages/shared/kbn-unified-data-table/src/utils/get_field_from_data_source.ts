/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewField } from '@kbn/data-views-plugin/public';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';
import { type DataSource, EsqlSource, IndexPatternSource } from '@kbn/data-source';

/**
 * Resolves a `DataViewField` for a given column name from a `DataSource`.
 * For `EsqlSource`, synthesises one from the raw `DatatableColumn`.
 */
export function getFieldFromDataSource(
  dataSource: DataSource | undefined,
  fieldName: string
): DataViewField | undefined {
  if (!dataSource) return undefined;
  if (dataSource instanceof IndexPatternSource) {
    return dataSource.getDataView().fields.getByName(fieldName);
  }
  if (dataSource instanceof EsqlSource) {
    const column = dataSource.resultColumns.find((c) => c.name === fieldName);
    if (!column) return undefined;
    return new DataViewField(convertDatatableColumnToDataViewFieldSpec(column));
  }
  return undefined;
}
