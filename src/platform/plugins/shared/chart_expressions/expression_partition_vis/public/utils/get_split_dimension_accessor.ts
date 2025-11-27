/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AccessorFn } from '@elastic/charts';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import type { FieldFormat, FormatFactory } from '@kbn/field-formats-plugin/common';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import { getColumnByAccessor } from '@kbn/chart-expressions-common';
import { getFormatter } from './formatters';

export const getSplitDimensionAccessor = (
  columns: DatatableColumn[],
  splitDimension: ExpressionValueVisDimension | string,
  formatters: Record<string, FieldFormat | undefined>,
  defaultFormatFactory: FormatFactory
): AccessorFn => {
  const splitChartColumn = getColumnByAccessor(splitDimension, columns)!;
  const accessor = splitChartColumn.id;
  const formatter = getFormatter(splitChartColumn, formatters, defaultFormatFactory);

  const fn: AccessorFn = (d) => {
    const v = d[accessor];
    if (v === undefined) {
      return;
    }

    const f = formatter.convert(v);
    return f;
  };

  return fn;
};
