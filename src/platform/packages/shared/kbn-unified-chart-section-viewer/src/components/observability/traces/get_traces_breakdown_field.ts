/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';
import type { UnifiedHistogramFetchParams } from '@kbn/unified-histogram/types';

/**
 * Resolves the selected traces breakdown field for the toolbar selector.
 * ES|QL has no Classic DataView, so the field is built from result columns
 * (same path as Unified Histogram `process_fetch_params`).
 */
export const getTracesBreakdownField = ({
  breakdownField,
  isESQLQuery,
  columns,
  dataView,
}: {
  breakdownField: string | undefined;
  isESQLQuery: boolean;
  columns: UnifiedHistogramFetchParams['columns'];
  dataView: DataView | undefined;
}): DataViewField | undefined => {
  if (!breakdownField) {
    return undefined;
  }

  if (isESQLQuery) {
    const breakdownColumn = columns?.find((column) => column.name === breakdownField);
    return breakdownColumn
      ? new DataViewField(convertDatatableColumnToDataViewFieldSpec(breakdownColumn))
      : undefined;
  }

  return dataView?.getFieldByName(breakdownField);
};
