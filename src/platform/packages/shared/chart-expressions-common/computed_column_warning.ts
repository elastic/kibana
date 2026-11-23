/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableColumn } from '@kbn/expressions-plugin/common';

/**
 * A column that the ES|QL query creates is filtered with an ES|QL filter, that is applied to the queries
 * that have the column. A date column is not, as the time range is what is changed for it.
 */
const isUnfilterableComputedDateColumn = (column: DatatableColumn): boolean =>
  column.isComputedColumn === true &&
  column.meta?.sourceParams?.isSourceFieldFilterable !== true &&
  column.meta.type === 'date';

export const isFilterableColumnSet = (columns: Array<DatatableColumn | undefined>): boolean => {
  const defined = columns.filter((c): c is DatatableColumn => c != null);
  return !defined.some(isUnfilterableComputedDateColumn);
};
