/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { DocViewFilterFn } from '../types';

interface Params {
  dataViewField: DataViewField | undefined;
  hideFilteringOnComputedColumns: boolean | undefined; // for ES|QL custom fields which do not not exist in the index
  onFilter: DocViewFilterFn | undefined;
}

export function shouldShowFieldFilterInOutActions({
  dataViewField,
  hideFilteringOnComputedColumns,
  onFilter,
}: Params): boolean {
  if (!onFilter || !dataViewField || !dataViewField.filterable) {
    return false;
  }
  return !hideFilteringOnComputedColumns || !dataViewField.isComputedColumn;
}

export function shouldShowFieldFilterExistAction(params: Params): boolean {
  const { dataViewField } = params;
  return shouldShowFieldFilterInOutActions(params) && !dataViewField?.scripted;
}
