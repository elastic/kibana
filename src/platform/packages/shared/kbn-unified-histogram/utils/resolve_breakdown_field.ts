/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSource } from '@kbn/data-source';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { isESQLColumnGroupable } from '@kbn/esql-utils';
import { fieldSupportsBreakdown } from '@kbn/field-utils';

/**
 * Resolves a breakdown field name against the data source, keeping only fields the chart can group by
 * (the same ones the breakdown selector offers) so the selector label stays in sync with the chart.
 */
export const resolveBreakdownField = ({
  breakdownField,
  dataSource,
  columns,
}: {
  breakdownField: string | undefined;
  dataSource: DataSource;
  /** ES|QL result columns; ignored for a data view source. */
  columns: readonly DatatableColumn[] | undefined;
}): DataViewField | undefined => {
  if (!breakdownField) {
    return undefined;
  }

  if (dataSource.kind === 'esql') {
    const breakdownColumn = columns?.find((column) => column.name === breakdownField);
    return breakdownColumn && isESQLColumnGroupable(breakdownColumn)
      ? new DataViewField(convertDatatableColumnToDataViewFieldSpec(breakdownColumn))
      : undefined;
  }

  const field = dataSource.getDataView().getFieldByName(breakdownField);
  return field && fieldSupportsBreakdown(field) ? field : undefined;
};
